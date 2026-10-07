import json
import logging

logger = logging.getLogger(__name__)

def get_response_format():

    return {
        "success": False,
        "errors": [],
        "error_code": None,
        "data": {},
        "meta": {},
    }


def convert_data(data):
    try:
        post_data = data.decode('utf8')
        post_data = json.loads(post_data)
    except Exception as e:
        logger.error("Failed to convert data.", str(e), data)
        post_data = None
    
    return post_data