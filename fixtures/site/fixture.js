const corpus = await fetch("/corpus.json").then((response) => response.json());
const fixtures = document.querySelector("#fixtures");
const renderDelayMs = Number(
  new URL(window.location.href).searchParams.get("renderDelayMs") ?? "0",
);

if (Number.isFinite(renderDelayMs) && renderDelayMs > 0) {
  await new Promise((resolve) => setTimeout(resolve, renderDelayMs));
}

function transform(value, name) {
  if (name === "append-newline") return `${value}\n`;
  if (name === "trim-indentation") {
    return value
      .split("\n")
      .map((line) => line.trimStart())
      .join("\n");
  }
  if (name === "tabs-to-spaces") return value.replaceAll("\t", "    ");
  if (name === "inject-zero-width") return value.replace("token", "to\u200bken");
  if (name === "normalize-nfd") return value.normalize("NFD");
  return value;
}

for (const [id, fixture] of Object.entries(corpus)) {
  const section = document.createElement("section");
  section.className = "snippet";
  section.dataset.snippetId = id;

  const heading = document.createElement("h2");
  heading.textContent = id;
  const pre = document.createElement("pre");
  pre.dataset.snippetId = id;
  const code = document.createElement("code");
  code.dataset.snippetId = id;
  code.textContent = fixture.source;
  pre.append(code);

  const button = document.createElement("button");
  button.type = "button";
  button.id = `copy-${id}`;
  button.setAttribute("aria-label", `Copy code for ${id}`);
  button.textContent = "Copy code";
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(transform(fixture.source, fixture.transform));
    button.textContent = "Copied";
  });

  section.append(heading, pre, button);
  fixtures.append(section);
}

// Responsive documentation themes commonly keep inactive tab content mounted.
// Discovery must ignore these hidden copy controls instead of reporting a
// timeout for something a reader cannot interact with.
const hiddenSection = document.createElement("section");
hiddenSection.hidden = true;
const hiddenPre = document.createElement("pre");
const hiddenCode = document.createElement("code");
hiddenCode.textContent = "npm install hidden-example";
hiddenPre.append(hiddenCode);
const hiddenButton = document.createElement("button");
hiddenButton.type = "button";
hiddenButton.setAttribute("aria-label", "Copy hidden code");
hiddenButton.textContent = "Copy code";
hiddenSection.append(hiddenPre, hiddenButton);
fixtures.append(hiddenSection);
