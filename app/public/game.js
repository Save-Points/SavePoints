const params = new URLSearchParams(window.location.search);
const gameId = params.get("id");

document.getElementById("gameInfo").textContent =
  "Current Game ID: " + gameId;

