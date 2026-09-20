from agent_setup.diff import diff


def test_diff_renders():
    report = diff(profile="minimal")
    text = report.render()
    assert "Agent Setup Diff" in text
    assert "SKILLS" in text
