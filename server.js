// Prework and Importing
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const { default: humanId } = require("human-id");
const string = require("string-sanitizer");
const cors = require("cors");

const {
  uniqueNamesGenerator,
  adjectives,
  animals,
} = require("unique-names-generator");

const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const { LocalStorage } = require("node-localstorage");
let localStorage = new LocalStorage("./localStorage");
localStorage.setItem("game-status", "active");

const Team = require("./models/Team");
const { default: mongoose } = require("mongoose");

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

// server creation
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// State Declaration
let definedLevelQuestions = [
  "l1",
  "l2",
  "l3",
  "l4",
  "l5",
  "l6",
  "l7",
  "l8",
  "l9",
  "l10",
];
let definedSolutions = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
];

// Helper functions

const connectDB = async () => {
  try {
    await mongoose.connect(
      `${process.env.MONGODB_URL}/${process.env.MONGODB_NAME}`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("⚡ MongoDB connected!!");
  } catch (err) {
    console.log("❌ Failed to connect to MongoDB", err);
  }
};
connectDB();
function generateFinCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codes = [];
  for (let index = 0; index < 10; index++) {
    codes.push(
      characters.charAt(Math.floor(Math.random() * characters.length))
    );
  }
  return codes;
}
// user defined shuffle
function shuffle(levels, solutions) {
  let l = [...levels];
  let s = [...solutions];
  let shuffledLevels = [];
  let shuffledSolutions = [];
  for (let index = 0; index < definedLevelQuestions.length; index++) {
    console.log(
      "index: ",
      index,
      "definedLevelQuestions.length: ",
      definedLevelQuestions.length
    );

    let randomIndex = Math.floor(Math.random() * l.length);
    shuffledLevels.push(l[randomIndex]);
    shuffledSolutions.push(s[randomIndex]);
    l.splice(randomIndex, 1);
    s.splice(randomIndex, 1);
  }
  return { shuffledLevels, shuffledSolutions };
}
// general shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getStartQuestionAndAnswer() {
  return { startQuestion: "startQuestion", startAnswer: "startAnswer" };
}

function getCaptchaQuestionAndAnswer() {
  return { CQuestion: "CQuestion", CAnswer: "CAnswer" };
}

function generateRoutes() {
  let { shuffledLevels, shuffledSolutions } = shuffle(
    definedLevelQuestions,
    definedSolutions
  );
  let finCodes = generateFinCode();
  let route = [];
  let CQmap = shuffleArray([1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
  for (let index = 0; index < shuffledLevels.length; index++) {
    let { CQuestion, CAnswer } = getCaptchaQuestionAndAnswer();
    route.push({
      levelQuestion: shuffledLevels[index],
      qrCodeSolution: shuffledSolutions[index],
      finCode: finCodes[index],
      captchaQuestion: CQmap[index] === 1 ? CQuestion : "",
      captchaAnswer: CQmap[index] === 1 ? CAnswer : "",
      captcha: CQmap[index] === 1 ? true : false,
    });
  }
  console.log(route);
  return route;
}

function generateAccessToken(teamID) {
  return jwt.sign({ teamID: teamID }, process.env.TOKEN_SECRET, {
    expiresIn: "7d",
  });
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) console.log(err);
    if (err) return res.sendStatus(403);
    req.user = user;

    next();
  });
}
function checkGameStatus(req, res, next) {
  if (localStorage.getItem("game-status") === "active") {
    next();
  } else {
    res.sendStatus(403);
  }
}

async function checkComplete(teamID, fincode2) {
  const team = await Team.findOne({ teamID: teamID });
  if (!team) return false;
  if (fincode2 === "middleware") {
    console.log(team.complete, "from middleware function");
    return team.complete;
  } else {
    console.log("from checkComplete function");

    if (team.current === 10) {
      console.log("from checkComplete function");

      let fincode = team.route
        .map((item) => {
          return item.finCode;
        })
        .join("-");

      let checkFincode =
        string.sanitize(fincode).toLowerCase() ===
        string.sanitize(fincode2).toLowerCase();
      console.log(string.sanitize(fincode).toLowerCase());
      console.log(string.sanitize(fincode2).toLowerCase());
      console.log(checkFincode);
      if (checkFincode) {
        await Team.findOneAndUpdate(
          { teamID: teamID },
          { complete: true, completeTime: new Date() }
        );
        return true;
      }
      return false;
    }
    return false;
  }
}

async function checkCompleteMiddleware(req, res, next) {
  let teamID = req.user.teamID;

  if (await checkComplete(teamID, "middleware")) {
    res.send({ status: "FS", message: "You have already completed the game" });
  } else {
    next();
  }
}
let rank = [];
async function calculateRank() {
  let teams = await Team.find({});
  teams = teams.sort((a, b) => {
    return b.current - a.current;
  });
  teams = teams.sort((a, b) => {
    return a.completeTime - b.completeTime;
  });

  rank = teams.map((item, index) => {
    return {
      teamID: item.teamID,
      level: item.current,
      rank: index + 1,
      completionTime: item.completeTime
        ? item.completeTime.toLocaleString()
        : "",
    };
  });
  return rank;
}

// socket.io
io.on("connection", (socket) => {
  console.log("🔗 new user connection");
});

setInterval(async () => {
  await calculateRank();
  io.emit("leaderboard", {
    rank: rank,
  });
}, 20000);

// Routes
app.get("/", (req, res) => {
  res.send("Game Status: " + localStorage.getItem("game-status"));
});
app.get("/calculateRank", (req, res) => {
  calculateRank();
  res.send({ rank });
});
app.get("/blockGame/gigachadbigcockenergyonlypls", (req, res) => {
  localStorage.setItem("game-status", "blocked");
  res.send("Game is now blocked");
});
app.get("/unblockGame/gigachadbigcockenergyonlypls", (req, res) => {
  localStorage.setItem("game-status", "active");
  res.send("Game is now active");
});
app.post("/game/registerTeam", checkGameStatus, (req, res) => {
  let teamID = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
    length: 2,
  });
  let teamRoute = generateRoutes();
  let startObj = getStartQuestionAndAnswer();

  let team = new Team({
    teamID,
    teamMembers: req.body.teamMembers,
    current: -1,
    route: teamRoute,
    startQuestion: startObj.startQuestion,
    startAnswer: startObj.startAnswer,
  });
  team.save((err, team) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send({
        teamID,
        accessToken: generateAccessToken(teamID),
      });
    }
  });
});

// STATUS :
// 1. CA => Correct Answer
// 2. WA => Wrong Answer
// 2.1 WAQ => Wrong Answer and QR Code
// 2.2 WQ => Wrong QR`Code
// 3. GAS => Game is already started
// 4. GNS => Game Not Started
// 5. WC => Wrong Current --> reload page
// 6. CG => Completed Game --> take to fincode
// 7. GNF => Game not finished
// 8. FS => FinCode Submitted --> show on leaderboard, game complete

// TODO: make a socket server to send the players the next level
// socket server sends only rank of the team and only leader board

app.get(
  "/game/getStartQuestion",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({
          startQuestion: team.startQuestion,
        });
      }
    });
  }
);

app.post(
  "/game/checkStartAnswer",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    // PARAMS => startAnswer : String
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else if (team.current !== -1) {
        res.status(200).send({
          status: "GAS",
          message: "You have already started the game",
        });
      } else {
        console.log(team, req.user);
        if (
          team.startAnswer.trim().toLowerCase() ===
          req.body.startAnswer.trim().toLowerCase()
        ) {
          team.current = 0;
          team.save();
          //emit to player the next question
          calculateRank();
          io.emit("leaderboard", {
            rank: rank,
          });
          res.status(200).send({
            status: "CA",
            nextQuestion: team.route[team.current].levelQuestion,
            nextCaptchaQuestion: team.route[team.current].captchaQuestion,
            current: team.current,
          });
        } else {
          res.status(200).send({ status: "WA" });
        }
      }
    });
  }
);

app.get(
  "/game/getQuestion",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else {
        if (!team)
          return res.send({ status: "TNF", message: "Team not found" });
        if (team.current === -1) {
          res.status(200).send({
            status: "GNS",
            message: "You have not started the game yet",
          });
        } else if (team.current === 10) {
          res.status(200).send({
            status: "CG",
            message: "You have completed the game",
          });
        } else {
          res.status(200).send({
            question: team.route[team.current].levelQuestion,
            current: team.current,
            captcha: team.route[team.current].captcha,
            cquestion: team.route[team.current].captchaQuestion,
          });
        }
      }
    });
  }
);

app.post(
  "/game/checkAnswer",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    // PARAMS =>  captchaAnswer : String, qrCodeSolution : String, current : Number
    Team.findOne({ teamID: req.user.teamID }, async (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else if (team.current === -1) {
        res.status(200).send({
          status: "GNS",
          message: "You have not started the game yet",
        });
      } else if (team.current === 10) {
        res.status(200).send({
          status: "CG",
          message: "You have completed the game",
        });
      } else if (team.current !== req.body.current) {
        res.status(200).send({
          status: "WC",
          message: "Out of sync",
        });
      } else {
        let checkQR =
          team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
          req.body.qrCodeSolution.trim().toLowerCase();
        let checkCaptcha = team.route[team.current].captcha
          ? team.route[team.current].captchaAnswer.trim().toLowerCase() ===
            req.body.captchaAnswer.trim().toLowerCase()
          : true;

        // let checkAnswerWithCaptcha = team.route[team.current].captcha
        //   ? team.route[team.current].captchaAnswer.trim().toLowerCase() ===
        //       req.body.captchaAnswer.trim().toLowerCase() &&
        //     team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
        //       req.body.qrCodeSolution.trim().toLowerCase()
        //   : team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
        //     req.body.qrCodeSolution.trim().toLowerCase();

        if (checkCaptcha && checkQR) {
          team.current = team.current + 1;
          await team.save();
          console.log("CURRENT:", team.current);

          if (team.current === 10) {
            res.status(200).send({
              status: "CG",
              message: "You have completed the game",
            });
          } else {
            calculateRank();
            io.emit("leaderboard", {
              rank: rank,
            });
            console.log("CA");
            return res.status(200).send({
              status: "CA",
              nextQuestion: team.route[team.current].levelQuestion,
              nextCaptchaQuestion: team.route[team.current].captchaQuestion,
              current: team.current,
              finCode: team.route[team.current].finCode,
            });
          }
        }
        if (!checkCaptcha && !checkQR) {
          console.log("WAQ");

          return res.status(200).send({
            status: "WAQ",
            message: "Wrong answer",
          });
        }
        if (!checkCaptcha && checkQR) {
          console.log("WA");

          return res.status(200).send({
            status: "WA",
            message: "Wrong answer",
          });
        }
        if (!checkQR && checkCaptcha) {
          console.log("WQ");

          return res.status(200).send({ status: "WQ" });
        }
      }
    });
  }
);

app.post(
  "/game/checkFincode",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  async (req, res) => {
    // PARAMS =>  finCode : String
    if (await checkComplete(req.user.teamID, req.body.fincode)) {
      console.log("Game Completed: " + req.user.teamID);
      res.status(200).send({
        status: "FS",
        message: "You have completed the game",
      });
    } else {
      res.status(200).send({ status: "WA" });
    }
  }
);
