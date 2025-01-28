import azure.functions as func
import logging
import json
import os
from datetime import datetime, timedelta, timezone
from azure.storage.blob import generate_blob_sas, BlobSasPermissions


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


@app.route(route="upload")
def http_trigger(req: func.HttpRequest) -> func.HttpResponse:
    try:
        now = datetime.now(timezone.utc)
        req_body = req.get_json()
        file_name = req_body.get("file_name")
        content_type = req_body.get("content_type")
        if not file_name:
            return func.HttpResponse(
                json.dumps({"error": "file_name is required"}),
                mimetype="application/json",
                status_code=400,
            )
        account_name = os.environ["STORAGE_ACCOUNT_NAME"]
        account_key = os.environ["STORAGE_ACCOUNT_KEY"]
        container_name = os.environ["STORAGE_CONTAINER_NAME"]
        timestamp = now.strftime("%Y%m%d-%H%M%S")
        blob_name = f"{timestamp}-{file_name}"
        expiry = now + timedelta(hours=1)

        sas = generate_blob_sas(
            account_name=account_name,
            container_name=container_name,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(write=True),
            expiry=expiry,
        )
        upload_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas}"
        return_val = {
            "upload_url": upload_url,
            "blob_name": blob_name,
            "expiry": expiry,
            "content_type": content_type,
        }
        return func.HttpResponse(
            body=json.dumps(return_val),
            mimetype="application/json",
            status_code=200,
        )
    except Exception as e:
        logging.error(e)
        return func.HttpResponse(
            json.dumps({"error": f"internal server error: {e}"}),
            mimetype="application/json",
            status_code=500,
        )
