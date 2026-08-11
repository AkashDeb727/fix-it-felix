import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])


def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event))

    try:
        body = json.loads(event.get("body", "{}"))

        complaint_id = body.get("complaint_id")
        status = body.get("status")

        allowed_status = [
            "Pending",
            "In Progress",
            "Resolved"
        ]

        if not complaint_id or not status:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "complaint_id and status are required."
                })
            }

        if status not in allowed_status:
            return {
                "statusCode": 400,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Status must be one of: Pending, In Progress, Resolved."
                })
            }

        table.update_item(
            Key={
                "complaint_id": complaint_id
            },
            UpdateExpression="SET #status = :status",
            ExpressionAttributeNames={
                "#status": "status"
            },
            ExpressionAttributeValues={
                ":status": status
            },
            ConditionExpression="attribute_exists(complaint_id)",
            ReturnValues="UPDATED_NEW"
        )

        logger.info("Complaint %s updated to %s", complaint_id, status)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Status updated successfully.",
                "complaint_id": complaint_id,
                "status": status
            })
        }

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {
                "statusCode": 404,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "message": "Complaint not found."
                })
            }

        logger.exception("DynamoDB error")

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "message": "Database error.",
                "error": str(e)
            })
        }

    except Exception as e:
        logger.exception("Status update failed")

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