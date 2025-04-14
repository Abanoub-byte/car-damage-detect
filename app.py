import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import tensorflow as tf  # Only import once — after disabling GPU
from flask import Flask, request, render_template, send_file, jsonify
import numpy as np
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2.utils.visualizer import Visualizer, ColorMode
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io
import torch
import tempfile

app = Flask(__name__)

    # Load classification model
MODEL_PATH = "car_damage_model.keras_FILES/car_damage_classification_model.h5"
model = tf.keras.models.load_model(MODEL_PATH)
CATEGORIES = ["Damaged", "Not Damaged"]

    # Load segmentation model once
MODEL_PATH2 = "segemntaion_model/model_final(1).pth"
CONFIG_PATH = "segemntaion_model/config.yaml"

cfg = get_cfg()
cfg.merge_from_file(CONFIG_PATH)
cfg.MODEL.WEIGHTS = MODEL_PATH2
cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = 0.5
cfg.MODEL.DEVICE = "cpu"  # 🔥 Tell Detectron2 to use CPU

predictor = DefaultPredictor(cfg)


@app.route("/")
def index():
        return render_template("index.html")


@app.route("/predict_damage", methods=["POST"])
def predict_damage():
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files["image"]
        image = Image.open(file).convert("RGB").resize((224, 224))  # Convert to RGB & resize
        image_array = np.array(image) / 255.0  # Normalize
        image_array = np.expand_dims(image_array, axis=0)  # Add batch dimension
        
        # Make prediction
        prediction = model.predict(image_array)
        result = CATEGORIES[np.argmax(prediction)]

        # If Damaged, trigger segmentation
        if result == "Damaged":
            return jsonify({"prediction": result, "segmentation": "/predict_segmented_damage"})
        
        return jsonify({"prediction": result})


@app.route("/predict_segmented_damage", methods=["POST"])
def predict_segmented_damage():
        if "image" not in request.files:
            return "No image uploaded", 400

        file = request.files["image"]
        image = Image.open(file).convert("RGB")
        image = np.array(image)

        # Get model prediction
        outputs = predictor(image)
        instances = outputs["instances"].to("cpu")

        # Visualize predictions with bounding boxes and labels
        v = Visualizer(image[:, :, ::-1], scale=0.5, instance_mode=ColorMode.IMAGE_BW)
        out = v.draw_instance_predictions(instances)

        # Save the image with bounding boxes to a buffer
        img_byte_arr = io.BytesIO()
        Image.fromarray(out.get_image()[:, :, ::-1]).save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        # Return the segmented image to be displayed on the website
        return send_file(img_byte_arr, mimetype="image/png")


from datetime import datetime

@app.route("/download_pdf", methods=["POST"])
def download_pdf():
    if "image" not in request.files:
        return "No image uploaded", 400

    file = request.files["image"]
    pil_image = Image.open(file).convert("RGB")

    # Classification
    image_for_classification = pil_image.resize((224, 224))
    image_array = np.array(image_for_classification) / 255.0
    image_array = np.expand_dims(image_array, axis=0)
    prediction = model.predict(image_array)
    result = CATEGORIES[np.argmax(prediction)]

    # Segmentation
    image_for_segmentation = np.array(pil_image)
    outputs = predictor(image_for_segmentation)
    instances = outputs["instances"].to("cpu")

    v = Visualizer(image_for_segmentation[:, :, ::-1], scale=0.5, instance_mode=ColorMode.IMAGE_BW)
    out = v.draw_instance_predictions(instances)

    # Save the segmented image to buffer
    img_byte_arr = io.BytesIO()
    Image.fromarray(out.get_image()[:, :, ::-1]).save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)

    # Create the PDF
    pdf_byte_arr = io.BytesIO()
    c = canvas.Canvas(pdf_byte_arr, pagesize=letter)

    # Add Date/Time
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 780, f"Report Generated: {now}")

    # Add Prediction Result
    c.setFont("Helvetica", 12)
    c.drawString(50, 750, f"Car Damage Prediction: {result}")

    # Add Segmented Image
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_img_file:
        temp_img_file.write(img_byte_arr.getvalue())
        temp_img_file.close()

        c.drawImage(temp_img_file.name, 50, 400, width=500, height=300)

    c.showPage()
    c.save()
    pdf_byte_arr.seek(0)

    return send_file(pdf_byte_arr, as_attachment=True, download_name="car_report.pdf", mimetype="application/pdf")



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
