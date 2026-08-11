import json
import boto3
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["DYNAMODB_TABLE"])

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json"
}


def lambda_handler(event, context):
    try:
        response = table.scan()
        items = response.get("Items", [])

        stats = {
            "total": len(items),
            "pending": 0,
            "in_progress": 0,
            "resolved": 0,
            "high_priority": 0
        }

        for item in items:
            status = item.get("status", "Pending")

            if status == "Pending":
                stats["pending"] += 1
            elif status == "In Progress":
                stats["in_progress"] += 1
            elif status == "Resolved":
                stats["resolved"] += 1

            if item.get("priority") == "High":
                stats["high_priority"] += 1

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(stats)
        }

    except Exception as e:
        logger.exception("Dashboard error")

        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "Internal Server Error",
                "error": str(e)
            })
        }