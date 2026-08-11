import json
import logging
import os
import urllib.request
import urllib.error
from decimal import Decimal

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)


def get_all_complaints():
    complaints = []

    response = table.scan()
    complaints.extend(response.get("Items", []))

    while "LastEvaluatedKey" in response:
        response = table.scan(
            ExclusiveStartKey=response["LastEvaluatedKey"]
        )
        complaints.extend(response.get("Items", []))

    return complaints


def ask_gemini(question, complaints):

    api_key = os.environ["GEMINI_API_KEY"]
    model = os.environ["GEMINI_MODEL"]

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    prompt = f"""
You are Felix, the AI assistant for Fix-It-Felix.

Fix-It-Felix is an AI-powered civic maintenance platform.

You have complete access to the complaint database below.

Answer ONLY using this database.

You can:
- Count complaints
- Filter by issue type
- Filter by status
- Filter by city
- Filter by state
- Filter by ward
- Filter by address
- Filter by priority
- Show complaint IDs
- Summarize complaints
- Find complaint trends
- Tell which area has the highest complaints
- Show complaints with images
- Calculate statistics

If multiple complaints match, summarize them.

If an image_url exists and the user asks about a complaint,
include the image URL.

If the answer cannot be found in the complaint database, reply exactly:

I couldn't find any matching complaint in the database.

If the user asks something unrelated to civic complaints, reply:

I can only answer questions related to the Fix-It-Felix complaint database.

Complaint fields include:
- complaint_id
- issue_type
- description
- status
- priority
- city
- state
- ward
- address
- latitude
- longitude
- image_url
- timestamp

Complaint Database:

{json.dumps(complaints, cls=DecimalEncoder)}

User Question:

{question}
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
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 1024
        }
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:

        with urllib.request.urlopen(request) as response:

            result = json.loads(response.read().decode())

            return (
                result["candidates"][0]
                ["content"]["parts"][0]["text"]
                .strip()
            )

    except urllib.error.HTTPError as e:

        error = e.read().decode()

        logger.error(error)

        raise Exception(f"Gemini API Error: {error}")


def lambda_handler(event, context):

    try:

        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*"
                },
                "body": ""
            }

        body = json.loads(event.get("body", "{}"))

        question = body.get("question", "").strip()

        if not question:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Question is required."
                })
            }

        logger.info(f"Question: {question}")

        complaints = get_all_complaints()

        logger.info(f"Loaded {len(complaints)} complaints")

        answer = ask_gemini(question, complaints)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "question": question,
                "answer": answer,
                "total_complaints": len(complaints)
            })
        }

    except Exception as e:

        logger.exception("Chatbot Error")

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Internal Server Error",
                "error": str(e)
            })
        }