var express = require('express');
var app = express();
var Q = require("q");

app.use("/eap/", express.static('public'));

const pythonShell = require('python-shell');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const mustache = require('mustache-express');
app.engine('mustache', mustache());
app.set('view engine', 'mustache');


const indico = require('indico.io');

indico.apiKey = "b88a14d4a97b56a6ed8f65efee05f9c4";

var testing = true;

var last_trial_id = 0;
var trials = {};

function getPoem(type) {
    var toR = Q.defer();
    var options = { pythonPath: 'python3'};

    if (type == "real") {
    	pythonShell.run('pick_selection.py', options, function (err, poem) {
	    if (poem == null) {
		poem = "of his elect content,<br>conform my soul as t were a church<br><br>unto her sacrament<br><br>love<br><br>love is anterior to life,<br><br>posterior to death,<br><br>initial of creation, and<br><br>the exponent of breath<br><br>satisfied<br><br>one blessing had i, than the rest<br><br>so larger to my eyes<br><br>that i stopped gauging, satisfied,<br><br>for this enchanted size<br><br>it was the limit of my dream,<br><br>the focus of my prayer, --<br><br>a perfect, paralyzing bliss<br><br>contented as despair<br><br>i knew no more of want or cold,<br>";
		toR.resolve(poem);
		return;
	    }
    	    poem = poem.join("<br />");
    	    toR.resolve(poem);
    	});
    } else if (type =="rnn") {
    	pythonShell.run('pick_selection_rnn.py', options, function (err, poem) {
	    if (poem == null) {
		poem = "of his elect content,<br>conform my soul as t were a church<br><br>unto her sacrament<br><br>love<br><br>love is anterior to life,<br><br>posterior to death,<br><br>initial of creation, and<br><br>the exponent of breath<br><br>satisfied<br><br>one blessing had i, than the rest<br><br>so larger to my eyes<br><br>that i stopped gauging, satisfied,<br><br>for this enchanted size<br><br>it was the limit of my dream,<br><br>the focus of my prayer, --<br><br>a perfect, paralyzing bliss<br><br>contented as despair<br><br>i knew no more of want or cold,<br>";
		toR.resolve(poem);
		return;
	    }
    	    poem = poem.join("<br />");
    	    toR.resolve(poem);
    	});
    } else if (type == "markov") {
    	pythonShell.run('pick_selection_markov.py', options, function (err, poem) {
	    if (poem == null) {
		poem = "of his elect content,<br>conform my soul as t were a church<br><br>unto her sacrament<br><br>love<br><br>love is anterior to life,<br><br>posterior to death,<br><br>initial of creation, and<br><br>the exponent of breath<br><br>satisfied<br><br>one blessing had i, than the rest<br><br>so larger to my eyes<br><br>that i stopped gauging, satisfied,<br><br>for this enchanted size<br><br>it was the limit of my dream,<br><br>the focus of my prayer, --<br><br>a perfect, paralyzing bliss<br><br>contented as despair<br><br>i knew no more of want or cold,<br>";
		toR.resolve(poem);
		return;
	    }
	    poem = poem.join("<br />");
    	    toR.resolve(poem);
    	});
    }
    return toR.promise;
}

function generateTrial() {
    var toR = Q.defer();

    // pick if we are using RNN or Markov
    var type = (flip() == 0 ? "rnn" : "markov");
    var fake_id = flip();
    var trial_id = last_trial_id++;

    trials[trial_id] = {
    	"fake_poem": fake_id,
    	"type": type,
    	"answer": false
    };

    var poems = [
    	getPoem(fake_id == 0 ? type : "real"),
    	getPoem(fake_id == 1 ? type : "real")
    ];

    return Q.all(poems).then(function (poems) {
    	return Q.all([indico.sentiment(poems[0]),
    		            indico.sentiment(poems[1])])
    	.then(function (sent) {
    		return {
      		    "poems": poems,
      		    "trial_id": trial_id,
		          "poem1sentiment": sentToColor(sent[0]),
		          "poem2sentiment": sentToColor(sent[1]),
              "poem1textcolor": textColor(sent[0]),
              "poem2textcolor": textColor(sent[1])
    		};
	    });
    });
}

function sentToColor(num) {
    if (num < .25) {
	     return ("#2E3E56");
    } else if (num > .25 && num < .45) {
	     return ("#174D6B");
    } else if (num > .45 && num < .55) {
	     return ("#4E8981");
    } else if (num > .55 && num < .75) {
	     return ("#91C6B2");
    } else if (num > .75) {
      return ("#FCEDC9");
    } else {
	     return ("#FCEDC9");
    }
}

function textColor(num) {
    if (num < .25) {
	     return ("#F2F1EF");
    } else if (num > .25 && num < .45) {
	     return ("#F2F1EF");
    } else if (num > .45 && num < .55) {
	     return ("#F2F1EF");
    } else if (num > .55 && num < .75) {
	     return ("#2E3E56");
    } else if (num > .75) {
      return ("#2E3E56");
    } else {
	     return ("#2E3E56");
    }
}

function flip() {
    return Math.floor((Math.random() * 2));
}

function tallyResults() {
    var rnnTotal = 0;
    var markovTotal = 0;
    var rnnRight = 0;
    var markovRight = 0;

    for (var key in trials) {
    	var trial = trials[key];
    	if (!trial.answer)
                continue;

    	if (trial.type == "rnn") {
            rnnTotal++;
            if (trial.fake_poem != trial.answer) {
          		rnnRight++;
            }
    	} else if (trial.type == "markov") {
            markovTotal++;
            if (trial.fake_poem != trial.answer) {
          		markovRight++;
            }
    	}
    }

    return {"rnnTotal": rnnTotal,
	    "markovTotal": markovTotal,
	    "rnnRight": rnnRight,
	    "markovRight": markovRight};
}

app.get('/eap/charts', function(req, res) {
    res.render('charts');
});

app.get('/eap/chartInfo', function(req, res){
  var results = tallyResults();
  results.markovRight += 1;
  results.markovTotal += 1;
  results.rnnRight +=1;
  results.rnnTotal +=1;
  res.send(results);
});

app.get('/eap/', function (req, res) {
    generateTrial().then(function (trial) {
	     res.render('turing',
    		   { "poem1": trial.poems[0],
    		     "poem2": trial.poems[1],
    		     "trial_id": trial.trial_id,
		         "poem1sentiment": trial.poem1sentiment,
		         "poem2sentiment": trial.poem2sentiment,
             "poem1textcolor": trial.poem1textcolor,
             "poem2textcolor": trial.poem2textcolor
    		   });
    });
});

app.post('/eap/ajaxSendData', function(req, res) {
    if (!(req.body.trial_id in trials)) {
	res.send({"result": false});
	return;
    }
    trials[req.body.trial_id].answer = req.body.answer;

    res.send({"result": trials[req.body.trial_id].answer != trials[req.body.trial_id].fake_poem});
});

app.get('/eap/ajaxGetData', function(req, res){
    generateTrial().then(function (trial) {
    	res.send({ "poem1": trial.poems[0],
		   "poem2": trial.poems[1],
		   "trial_id": trial.trial_id,
		   "poem1color": trial.poem1sentiment,
		   "poem2color": trial.poem2sentiment,
       "poem1textcolor": trial.poem1textcolor,
       "poem2textcolor": trial.poem2textcolor
		 });
    });
});

app.get('/eap/scores', function(req, res) {
    res.render("leaderboard", {});
});

app.get('/eap/scoreboard', function (req, res) {
    var people = [
    	{ "name": "John", "correct": 5, "incorrect": 5, "percent correct": "50%"},
    	{ "name": "Some other guy", "correct": 100, "incorrect": 25, "percent correct": "asfa$%"},
    	{ "name": "mmmhmmm", "correct": 22, "incorrect": 2, "percent correct": "%gds%"}
    ]
    res.render('scoreboard', {"people": people});
});

app.listen(3001, "127.0.0.1", function () {
    console.log("Running");
});
