import json
import uuid
import logging
import os
import base64
import urllib.request
import urllib.error
import boto3
from decimal import Decimal, InvalidOperation

from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses = boto3.client("ses")
s3 = boto3.client("s3")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])


def analyze_complaint(title, description, street_address, landmark, postal_code, specific_location):

    api_key = os.environ["GEMINI_API_KEY"]
    model = os.environ["GEMINI_MODEL"]

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    prompt = f"""
You are an AI assistant for a civic maintenance platform.

Analyze the complaint below and return ONLY valid JSON.

Complaint Title:
{title}

Complaint Description:
{description}

Location Details:
Street Address: {street_address}
Landmark: {landmark}
Postal Code: {postal_code}
Specific Location: {specific_location}

Return ONLY this JSON format:

{{
  "category": "",
  "priority": "",
  "department": "",
  "summary": ""
}}

Rules:

Categories:
- Road
- Water
- Electricity
- Garbage
- Drainage
- Street Light
- Traffic
- Public Safety
- Other

Priority:
- High
- Medium
- Low

Departments:
- Road Maintenance
- Water Department
- Electricity Department
- Sanitation Department
- Traffic Department
- Municipal Corporation
- Public Works

Summary:
- Maximum 30 words
- No markdown
- No explanation
- No extra text
"""

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    with urllib.request.urlopen(request) as response:
        result = json.loads(response.read().decode("utf-8"))

    logger.info("Gemini Response:")
    logger.info(json.dumps(result, indent=2))

    if "candidates" not in result or len(result["candidates"]) == 0:
        raise Exception(f"Unexpected Gemini response: {result}")

    candidate = result["candidates"][0]

    if "content" not in candidate:
        raise Exception(f"No content returned by Gemini: {result}")

    text = candidate["content"]["parts"][0]["text"]

    logger.info(f"Gemini Text: {text}")

    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    if text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    return json.loads(text)


def send_owner_email(subject, body):
    ses.send_email(
        Source=os.environ["SES_SENDER_EMAIL"],
        Destination={
            "ToAddresses": [os.environ["OWNER_EMAIL"]]
        },
        Message={
            "Subject": {
                "Data": subject
            },
            "Body": {
                "Text": {
                    "Data": body
                }
            }
        }
    )


def upload_complaint_image(complaint_id, image):

    header = ""
    data = image

    if image.startswith("data:") and ";base64," in image:
        header, data = image.split(";base64,", 1)

    extension = "jpg"

    if "image/png" in header:
        extension = "png"
    elif "image/jpeg" in header or "image/jpg" in header:
        extension = "jpg"
    elif "image/gif" in header:
        extension = "gif"
    elif "image/webp" in header:
        extension = "webp"

    content_type = header[5:].split(";")[0] if header.startswith("data:") else "image/jpeg"

    image_bytes = base64.b64decode(data)

    bucket_name = os.environ["S3_BUCKET"]

    image_key = f"complaints/{complaint_id}.{extension}"

    s3.put_object(
        Bucket=bucket_name,
        Key=image_key,
        Body=image_bytes,
        ContentType=content_type
    )

    image_url = f"https://{bucket_name}.s3.amazonaws.com/{image_key}"

    return image_key, image_url


def lambda_handler(event, context):

    try:

        logger.info(f"Incoming Event: {json.dumps(event)}")

        body = event.get("body")

        if body is None:
            return response(400, "Request body is missing")

        if isinstance(body, str):
            body = json.loads(body)

        citizen_name = body.get("citizen_name")
        title = body.get("title")
        description = body.get("description")
        raw_latitude = body.get("latitude")
        raw_longitude = body.get("longitude")

        street_address = body.get("street_address", "").strip()
        landmark = body.get("landmark", "").strip()
        postal_code = body.get("postal_code", "").strip()
        specific_location = body.get("specific_location", "").strip()

        image = body.get("image")

        if image:
            logger.info(f"Image field received. Length: {len(image)} characters.")
        else:
            logger.info("No image field received in request body.")

        required_fields = {
            "citizen_name": citizen_name,
            "title": title,
            "description": description,
            "latitude": raw_latitude,
            "longitude": raw_longitude
        }

        missing = [
            field
            for field, value in required_fields.items()
            if value in [None, ""]
        ]

        if missing:
            return response(
                400,
                f"Missing required fields: {', '.join(missing)}"
            )

        try:
            latitude = Decimal(str(raw_latitude))
            longitude = Decimal(str(raw_longitude))
        except (InvalidOperation, ValueError, TypeError):
            return response(
                400,
                "latitude and longitude must be valid numbers."
            )

        complaint_id = str(uuid.uuid4())

        timestamp = datetime.now(timezone.utc).isoformat()

        logger.info(f"Complaint ID Generated: {complaint_id}")

        image_key = ""
        image_url = ""

        if image:

            try:

                image_key, image_url = upload_complaint_image(complaint_id, image)

                logger.info(f"Image uploaded successfully: {image_key}")

            except Exception:

                logger.exception("Failed to upload complaint image to S3")

                return response(500, "Failed to upload complaint image. Please try again.")

        try:

            analysis = analyze_complaint(
                title,
                description,
                street_address,
                landmark,
                postal_code,
                specific_location
            )

        except urllib.error.HTTPError as e:

            error_body = e.read().decode()

            logger.error(f"Gemini HTTP Error: {e.code}")
            logger.error(error_body)

            analysis = {
                "category": "Other",
                "priority": "Medium",
                "department": "Municipal Corporation",
                "summary": "AI analysis unavailable."
            }

        except urllib.error.URLError as e:

            logger.error(f"Network Error: {e.reason}")

            analysis = {
                "category": "Other",
                "priority": "Medium",
                "department": "Municipal Corporation",
                "summary": "AI analysis unavailable."
            }

        except Exception:

            logger.exception("Gemini AI Error")

            analysis = {
                "category": "Other",
                "priority": "Medium",
                "department": "Municipal Corporation",
                "summary": "AI analysis unavailable."
            }

        item = {
            "complaint_id": complaint_id,
            "citizen_name": citizen_name,
            "title": title,
            "description": description,
            "category": analysis["category"],
            "priority": analysis["priority"],
            "department": analysis["department"],
            "summary": analysis["summary"],
            "latitude": latitude,
            "longitude": longitude,
            "street_address": street_address,
            "landmark": landmark,
            "postal_code": postal_code,
            "specific_location": specific_location,
            "image_key": image_key,
            "image_url": image_url,
            "status": "Pending",
            "timestamp": timestamp
        }

        try:

            table.put_item(Item=item)

            logger.info("Complaint stored successfully.")
            logger.info(json.dumps(item, indent=2, default=str))

        except Exception:

            logger.exception("Failed to store complaint in DynamoDB")

            return response(500, "Failed to store complaint. Please try again.")

        subject = f"New Civic Complaint - {complaint_id}"

        email_body = f"""
Complaint ID: {complaint_id}
Citizen: {citizen_name}
Title: {title}
Category: {analysis["category"]}
Priority: {analysis["priority"]}
Department: {analysis["department"]}
Location: {latitude}, {longitude}
Street Address: {street_address}
Landmark: {landmark}
Postal Code: {postal_code}
Specific Location: {specific_location}
Status: Pending
Time: {timestamp}

Description:
{description}
"""

        if image_url:
            email_body += f"""
Image URL:
{image_url}
"""

        try:
            send_owner_email(subject, email_body)
            logger.info("Owner email sent successfully")
        except Exception:
            logger.exception("Failed to send owner email")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Complaint received successfully.",
                "complaint_id": complaint_id,
                "timestamp": timestamp,
                "status": "Pending",
                "data": {
                    "citizen_name": citizen_name,
                    "title": title,
                    "description": description,
                    "latitude": str(latitude),
                    "longitude": str(longitude),
                    "street_address": street_address,
                    "landmark": landmark,
                    "postal_code": postal_code,
                    "specific_location": specific_location,
                    "image_url": image_url
                },
                "ai_analysis": analysis
            })
        }

    except Exception as e:

        logger.exception("Unexpected Error")

        return response(500, str(e))


def response(status_code, message):

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({
            "message": message
        })
    }