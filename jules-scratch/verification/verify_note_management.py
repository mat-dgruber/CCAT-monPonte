from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:4200/login")

        page.wait_for_selector("input[name='email']", timeout=10000)
        page.fill("input[name='email']", "matheus.gruber123@gmail.com")
        page.fill("input[name='password']", "Md020304!!@@")
        page.wait_for_timeout(500) # Wait for 500ms

        page.locator("button[type='submit']").click(force=True)

        page.wait_for_url("**/notebooks", timeout=20000)
        page.screenshot(path="jules-scratch/verification/notebooks-page.png")

        # Create a new note
        page.click("button:has-text('Criar Nota')")
        page.wait_for_selector("app-modal", timeout=5000)
        page.fill("app-modal input[type='text']", "My New Note")
        page.fill("app-modal textarea", "This is the content of my new note.")
        page.screenshot(path="jules-scratch/verification/new-note-modal.png")
        page.click("app-modal button:has-text('Salvar')")

        # Wait for the new note to appear in the list
        page.wait_for_selector("div.note-item:has-text('My New Note')", timeout=5000)
        page.screenshot(path="jules-scratch/verification/new-note-created.png")

        # Click on the new note to open it in the editor
        page.click("div.note-item:has-text('My New Note')")
        page.wait_for_selector("app-note-editor", timeout=5000)
        page.screenshot(path="jules-scratch/verification/note-editor-view.png")

        # Delete the note
        page.click("app-note-editor button[title='Deletar Nota']")
        page.wait_for_selector("app-modal", timeout=5000)
        page.screenshot(path="jules-scratch/verification/delete-note-modal.png")
        page.click("app-modal button:has-text('Deletar')")

        # Wait for the note to be removed from the list
        page.wait_for_selector("div.note-item:has-text('My New Note')", state='detached', timeout=5000)
        page.screenshot(path="jules-scratch/verification/note-deleted.png")


    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
