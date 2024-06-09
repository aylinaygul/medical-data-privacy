from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pydicom
import random
import string
from cryptography.fernet import Fernet, InvalidToken
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import subprocess
import numpy as np
import nibabel as nib
import matplotlib.pyplot as plt
import base64
import logging

from io import BytesIO

app = Flask(__name__)
CORS(app) 

def create_dir(path):
    if not os.path.isdir(path):
        os.makedirs(path)

import subprocess

def bet(src_path, dst_path, frac="0.4"): 
    command = ["bet", src_path, dst_path, "-R", "-f", frac, "-g", "0"]
    subprocess.call(command)
    return

def strip_skull(src_path, dst_path, frac="0.4"):
    print("Working on:", src_path)
    try:
        bet(src_path, dst_path, frac)
    except RuntimeError:
        print("\tFailed on:", src_path)
    return


@app.route('/skull_strip', methods=['POST'])
def skull_strip():
    file = request.files['file']
    try:
        input_path = "temp_input.nii.gz"
        output_path = "temp_output.nii.gz"
        file.save(input_path)
        strip_skull(input_path, output_path)
        
        # Log the processing step
        print(f"Processed {input_path} and saved to {output_path}")
        
        return send_file(output_path, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

def display_nifti_image(nifti_file_path):
    img = nib.load(nifti_file_path)
    data = img.get_fdata()

    if len(data.shape) == 3:
        images = {}

        fig, ax = plt.subplots()
        ax.imshow(data[data.shape[0] // 2, :, :], cmap='gray')
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        images['axial_image'] = img_str

        fig, ax = plt.subplots()
        ax.imshow(data[:, data.shape[1] // 2, :], cmap='gray')
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        images['coronal_image'] = img_str

        fig, ax = plt.subplots()
        ax.imshow(data[:, :, data.shape[2] // 2], cmap='gray')
        buf = BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)
        images['sagittal_image'] = img_str

        return images
    else:
        return {'error': 'Unsupported NIfTI data shape'}

@app.route('/process_nifti', methods=['POST'])
def process_nifti():
    file = request.files['file']
    input_path = os.path.join('./', file.filename)
    processed_path = os.path.join('./', 'processed_' + file.filename)
    file.save(input_path)

    try:
        bet(input_path, processed_path)

        original_images = display_nifti_image(input_path)
        processed_images = display_nifti_image(processed_path)

        images = {
            'original': original_images,
            'processed': processed_images
        }

        return jsonify(images)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.remove(input_path)
        os.remove(processed_path)


def load_or_create_key():
    key_path = 'secret.key'
    if os.path.exists(key_path):
        with open(key_path, 'rb') as key_file:
            key = key_file.read()
    else:
        key = Fernet.generate_key()
        with open(key_path, 'wb') as key_file:
            key_file.write(key)
    return key

key = load_or_create_key()
fernet = Fernet(key)
print(f"Encryption Key: {key.decode()}") 

def random_string(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

pseudonym_map = {}

def pseudonymize(value):
    if value not in pseudonym_map:
        pseudonym_map[value] = random_string()
    return pseudonym_map[value]

def truncate_string(value, max_length):
    return value[:max_length] if len(value) > max_length else value

def age_to_bucket(age):
    if age < 10:
        return "0-10"
    elif age < 20:
        return "11-20"
    elif age < 30:
        return "21-30"
    else:
        return "90+"

def anonymize_dicom(dicom_data, method):
    if method == "suppression":
        dicom_data.PatientName = ""
        dicom_data.PatientID = ""
        dicom_data.PatientBirthDate = ""
        dicom_data.PatientSex = "O"
    elif method == "randomization":
        dicom_data.PatientName = random_string()
        dicom_data.PatientID = random_string()
        dicom_data.PatientBirthDate = ""
        dicom_data.PatientSex = random.choice(["M", "F", "O"])
    elif method == "pseudonymization":
        dicom_data.PatientName = pseudonymize(str(dicom_data.PatientName))
        dicom_data.PatientID = pseudonymize(dicom_data.PatientID)
        dicom_data.PatientBirthDate = ""
        dicom_data.PatientSex = "O"
    elif method == "bucketization":
        if hasattr(dicom_data, 'PatientAge'):
            age = int(dicom_data.PatientAge)
            dicom_data.PatientAge = age_to_bucket(age)
        dicom_data.PatientName = ""
        dicom_data.PatientID = ""
        dicom_data.PatientBirthDate = ""
        dicom_data.PatientSex = "O"
    elif method == "slicing":
        dicom_data.PatientName = "SliceA"
        dicom_data.PatientID = "SliceB"
        dicom_data.PatientBirthDate = "SliceC"
        dicom_data.PatientSex = "O"
    elif method == "encryption":
        if hasattr(dicom_data, 'PatientName') and dicom_data.PatientName:
            name_str = str(dicom_data.PatientName)
            encrypted_name = fernet.encrypt(name_str.encode()).decode()
            dicom_data.PatientName = truncate_string(encrypted_name, 64)
        if hasattr(dicom_data, 'PatientID') and dicom_data.PatientID:
            encrypted_id = fernet.encrypt(dicom_data.PatientID.encode()).decode()
            dicom_data.PatientID = truncate_string(encrypted_id, 64)
        dicom_data.PatientBirthDate = ""
        dicom_data.PatientSex = "O"
    return dicom_data

@app.route('/anonymize', methods=['POST'])
def anonymize():
    file = request.files['file']
    method = request.form['method']
    dicom_data = pydicom.dcmread(file)
    anonymized_dicom_data = anonymize_dicom(dicom_data, method)

    output_path = 'anonymized.dcm'
    anonymized_dicom_data.save_as(output_path)
    return send_file(output_path, as_attachment=True)

@app.route('/download_key', methods=['GET'])
def download_key():
    key_path = 'secret.key'
    return send_file(key_path, as_attachment=True)
logging.basicConfig(level=logging.DEBUG)

@app.route('/decrypt', methods=['POST'])
def decrypt():
    if 'file' not in request.files or 'key' not in request.files:
        logging.error("Missing file or key in the request")
        return jsonify({"error": "Missing file or key"}), 400
    
    try:
        dicom_file = request.files['file']
        key_file = request.files['key']
        
        # Read the key from the key file
        key = key_file.read().strip()
        fernet = Fernet(key)
        
        # Read the DICOM file
        dicom_data = pydicom.dcmread(dicom_file)
        logging.debug(f"Successfully read DICOM file: {dicom_data}")
        
        if hasattr(dicom_data, 'PatientName') and dicom_data.PatientName:
            try:
                decrypted_name = fernet.decrypt(dicom_data.PatientName.encode()).decode()
                dicom_data.PatientName = decrypted_name
                logging.debug(f"Decrypted PatientName: {decrypted_name}")
            except InvalidToken:
                logging.error("Invalid encryption token for PatientName")
                dicom_data.PatientName = "Decryption failed"

        if hasattr(dicom_data, 'PatientID') and dicom_data.PatientID:
            try:
                decrypted_id = fernet.decrypt(dicom_data.PatientID.encode()).decode()
                dicom_data.PatientID = decrypted_id
                logging.debug(f"Decrypted PatientID: {decrypted_id}")
            except InvalidToken:
                logging.error("Invalid encryption token for PatientID")
                dicom_data.PatientID = "Decryption failed"
    
    except Exception as e:
        logging.error(f"Error decrypting file: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 400
    
    def convert_to_str(value):
        return str(value) if value is not None else None

    response_data = {
        "PatientName": convert_to_str(dicom_data.PatientName),
        "PatientID": convert_to_str(dicom_data.PatientID),
        "PatientBirthDate": convert_to_str(dicom_data.PatientBirthDate),
        "PatientSex": convert_to_str(dicom_data.PatientSex)
    }

    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)
