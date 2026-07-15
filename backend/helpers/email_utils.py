import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional, List
import logging

import config

def send_email(
    to: str,
    subject: str,
    body: str,
    attachments: Optional[List[dict]] = None,
    sender_email: Optional[str] = None,
    sender_password: Optional[str] = None
) -> None:
    """
    Sends an email using Gmail SMTP.
    If sender_email and sender_password are not provided, uses the global configuration.
    attachments: list of dicts with 'filename' and 'content' (bytes)
    """
    email_user = sender_email or config.GMAIL_ADDRESS
    email_pass = sender_password or config.GMAIL_APP_PASSWORD
    
    if not email_user or not email_pass:
        logging.error("Cannot send email: sender credentials not configured")
        raise Exception("Email sender credentials not configured")
        
    msg = MIMEMultipart()
    msg['From'] = email_user
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    if attachments:
        for attachment_data in attachments:
            attachment = MIMEApplication(attachment_data['content'], _subtype="pdf")
            attachment.add_header('Content-Disposition', 'attachment', filename=attachment_data['filename'])
            msg.attach(attachment)
            
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(email_user, email_pass)
        server.send_message(msg)
        server.quit()
    except Exception as e:
        logging.error(f"Failed to send email to {to}: {e}")
        raise e
