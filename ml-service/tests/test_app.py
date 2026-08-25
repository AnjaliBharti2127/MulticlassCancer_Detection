def test_unknown_route_returns_consistent_404(client):
    response = client.get("/this-route-does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"


def test_app_imports_successfully():
    from app.main import app

    assert app.title == "patho-ml-service"
    assert app.version == "1.0.0"
