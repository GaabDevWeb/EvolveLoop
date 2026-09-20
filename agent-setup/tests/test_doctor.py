from agent_setup.doctor import doctor


def test_doctor_renders():
    report = doctor()
    text = report.render()
    assert "Agent Environment Doctor" in text
    assert report.status in ("healthy", "degraded", "broken")
