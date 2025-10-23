
import pytest
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the login page and log in
        page.goto("http://localhost:4200/login")
        page.get_by_label("Endereço de E-mail").fill("test@test.com")
        page.get_by_label("Senha").fill("password")
        page.get_by_role("button", name="Entrar").click()

        # 2. Wait for navigation to the notebooks page
        expect(page).to_have_url("http://localhost:4200/notebooks")

        # 3. Set viewport to a mobile size
        page.set_viewport_size({"width": 375, "height": 667})

        # 4. Screenshot of the notebooks list (initial mobile view)
        page.screenshot(path="jules-scratch/verification/01-notebooks-list.png")

        # 5. Click on the first notebook
        page.locator(".notebook-list li").first.click()

        # 6. Screenshot of the notes list
        page.wait_for_selector(".notes-column")
        page.screenshot(path="jules-scratch/verification/02-notes-list.png")

        # 7. Click on the first note
        page.locator(".note-drag-item").first.click()

        # 8. Screenshot of the note editor
        page.wait_for_selector(".note-editor-container")
        page.screenshot(path="jules-scratch/verification/03-note-editor.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)
