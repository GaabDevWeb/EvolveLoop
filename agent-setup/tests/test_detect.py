from agent_setup.detect import detect


def test_detect_returns_structure():
    result = detect()
    data = result.to_dict()
    assert "python" in data
    assert data["python"]["installed"] is True
    assert "git" in data
    assert "cursor" in data
