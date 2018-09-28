const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const recipesPath = './src/json/recipes.json';
const recipes = require(recipesPath);
const foodPath = './src/json/livsmedelsdata.json';
const foodList = require(foodPath);
const app = express();
const multer = require("multer");
const path = require("path");
const uuidv1 = require('uuid/v1');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const upload = multer({
    dest: "./tmp"
});

// app.get("/", express.static(path.join(__dirname, "./public")));
app.use(express.static('public'));

app.post("/api/recipe/add", upload.single("file"), (req, res) => {

    const tempPath = req.file.path;
    const recipe = JSON.parse(req.body.recipe); // Didn't work without the stringify in frontend and parsing in backend
    recipe.id = uuidv1().replace(/-/g, "");

    const fileExtention = path.extname(req.file.originalname);

    const targetPath = path.join(__dirname, "./public/" + recipe.id + fileExtention);

    recipes.push(recipe);

    fs.rename(tempPath, targetPath, err => {
        if (err) return handleError(err, res);
    });

    fs.writeFile(recipesPath, JSON.stringify(recipes), function (error) {
        if (error) console.log(error);
    });

    res
        .status(200)
        .contentType("text/plain")
        .end("File uploaded!");
});

app.get('/', function (req, res) {
    res.send('Hello World!')
})

app.get('/api/recipe/:id', function (request, response) {
    //loopa igenom recipes pch leta efter det med rätt id
    let r = recipes[request.params.id];
    response.json(r);
});

app.get('/api/food/find/:id', function (request, response) {
    let searchHits = foodList
        // .filter(food =>
        //     food.Namn
        //         .toLowerCase()
        //         .startsWith(request.params.id.toLowerCase())
        // )
        .filter(food =>
            food.Namn
                .toLowerCase()
                .includes(request.params.id.toLowerCase())
        )
    response.json(searchHits);
});

app.listen(3000, () => console.log('Listening on port 3000'));