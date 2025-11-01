fetch("/games")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("gamesContainer");
    container.textContent = "";

    data.games.forEach(game => {
      const card = document.createElement("div");
      card.className = "game-card";

      const img = document.createElement("img");
      img.src = game.coverUrl;
      img.alt = game.name;
      img.className = "game-cover";

      const title = document.createElement("p");
      title.textContent = game.name;
      title.className = "game-title";

      card.addEventListener("click", () => {
        window.location.href = `game.html?id=${game.id}`;
      });

      card.appendChild(img);
      card.appendChild(title);
      container.appendChild(card);
    });
  })
  .catch(err => console.error("Error loading games:", err));
