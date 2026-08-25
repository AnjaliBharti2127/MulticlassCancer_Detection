def test_predict_returns_503_when_model_not_loaded(client):
    response = client.post("/predict")

    assert response.status_code == 503
    assert response.json() == {
        "success": False,
        "error": {
            "code": "MODEL_NOT_LOADED",
            "message": "The prediction model is not loaded.",
        },
    }


def test_versioned_predict_returns_503_when_model_not_loaded(client):
    response = client.post("/api/v1/predict")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODEL_NOT_LOADED"


def test_predict_returns_503_even_with_an_upload(client):
    files = {"slideImage": ("slide.png", b"not-a-real-image", "image/png")}
    response = client.post("/predict", files=files)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODEL_NOT_LOADED"
