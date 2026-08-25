def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "status": "healthy",
        "service": "patho-ml-service",
        "version": "1.0.0",
        "modelLoaded": False,
    }


def test_versioned_health_endpoint(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["modelLoaded"] is False


def test_health_response_schema(client):
    response = client.get("/health")
    body = response.json()

    assert set(body.keys()) == {"status", "service", "version", "modelLoaded"}
    assert isinstance(body["status"], str)
    assert isinstance(body["service"], str)
    assert isinstance(body["version"], str)
    assert isinstance(body["modelLoaded"], bool)
