import azure.functions as func
import logging
import json
import os
from string import digits, ascii_lowercase
from datetime import datetime, timedelta, timezone
from azure.storage.blob import generate_container_sas, ContainerSasPermissions
from random import choices


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

def generate_sas_url(filename: str, job_id: str):
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(hours=1)
    formatted_expiry = expiry.strftime("%Y-%m-%dT%H:%M:%SZ")
    account_name = os.environ["STORAGE_ACCOUNT_NAME"]
    account_key = os.environ["STORAGE_ACCOUNT_KEY"]
    container_name = os.environ["STORAGE_CONTAINER_NAME"]
    blob_name = f"{job_id}/{filename}"
    # TODO: validate that this works as we expect.
    sas = generate_container_sas(
        account_name=account_name,
        container_name=container_name,
        blob_name=blob_name,
        account_key=account_key,
        permission=ContainerSasPermissions(write=True),
        expiry=expiry,
    )
    # sas = generate_blob_sas(
    #     account_name=account_name,
    #     container_name=container_name,
    #     blob_name=blob_name,
    #     account_key=account_key,
    #     permission=BlobSasPermissions(write=True),
    #     expiry=expiry,
    # )
    upload_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas}"
    return {
        "upload_url": upload_url,
        "blob_name": blob_name,
        "expiry": formatted_expiry,
    }



@app.route(route="upload")
def http_trigger(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        file_list = req_body.get("file_list")
        job_id = "".join(choices(digits + ascii_lowercase, k=8))
        urls = {}
        for file in file_list:
            urls[file] = generate_sas_url(file, job_id)
        # TODO: ensure that this matches correctly with the frontend
        return_val = {
            "job_id": job_id,
            "urls": urls,
            "date": datetime.now().strftime("%Y-%m-%d"),
        }
        # if not file_name:
        #     return func.HttpResponse(
        #         json.dumps({"error": "file_name is required"}),
        #         mimetype="application/json",
        #         status_code=400,
        #     )
        # sas = generate_blob_sas(
        #     account_name=account_name,
        #     container_name=container_name,
        #     blob_name=blob_name,
        #     account_key=account_key,
        #     permission=BlobSasPermissions(write=True),
        #     expiry=expiry,
        # )
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
