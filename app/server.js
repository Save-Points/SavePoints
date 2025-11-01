const express = require("express");
const { Pool } = require("pg");
const env = require("../env.json");

const app = express();
const pool = new Pool(env);
const hostname = "localhost";
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname + "/public"));

pool.connect().then(() => console.log(`Connected to ${env.database}`));

app.get("/games", (req, res) => {
  res.json({
    games: [
      { id: 1, name: "Elden Ring", coverUrl: "https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg" },
      { id: 2, name: "Baldur's Gate 3", coverUrl: "https://upload.wikimedia.org/wikipedia/en/1/12/Baldur%27s_Gate_3_cover_art.jpg" },
      { id: 3, name: "Hades II", coverUrl: "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcRiUHktACgYRU8V6pDkpdQ5HF1gHrVogvP1VTO6ansDC0jub2p3" },
      { id: 4, name: "The Legend of Zelda: Tears of the Kingdom", coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/fb/The_Legend_of_Zelda_Tears_of_the_Kingdom_cover.jpg" },
      { id: 5, name: "Cyberpunk 2077", coverUrl: "https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg" },
      { id: 6, name: "Stardew Valley", coverUrl: "https://upload.wikimedia.org/wikipedia/en/f/fd/Logo_of_Stardew_Valley.png" }
    ]
  });
});

app.listen(port, hostname, () => {
  console.log(`Listening at http://${hostname}:${port}`);
});