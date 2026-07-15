from typing import Optional
from gridfs import GridFSBucket
from gridfs.errors import NoFile
from bson.objectid import ObjectId

class StorageError(Exception):
    pass

def save_pdf(db, file_path: str, filename: str, metadata: Optional[dict] = None, bucket_name: str = "invoices") -> str:
    try:
        bucket = GridFSBucket(db, bucket_name=bucket_name)
        with open(file_path, "rb") as f:
            file_id = bucket.upload_from_stream(
                filename,
                f,
                metadata=metadata or {}
            )
        return str(file_id)
    except Exception as e:
        raise StorageError(f"Failed to save PDF to GridFS: {str(e)}")

def retrieve_pdf(db, file_id: str, bucket_name: str = "invoices") -> bytes:
    try:
        bucket = GridFSBucket(db, bucket_name=bucket_name)
        stream = bucket.open_download_stream(ObjectId(file_id))
        return stream.read()
    except NoFile:
        raise StorageError(f"File {file_id} not found in GridFS")
    except Exception as e:
        raise StorageError(f"Failed to retrieve PDF from GridFS: {str(e)}")

def delete_pdf(db, file_id: str, bucket_name: str = "invoices") -> None:
    try:
        bucket = GridFSBucket(db, bucket_name=bucket_name)
        bucket.delete(ObjectId(file_id))
    except NoFile:
        raise StorageError(f"File {file_id} not found in GridFS")
    except Exception as e:
        raise StorageError(f"Failed to delete PDF from GridFS: {str(e)}")
