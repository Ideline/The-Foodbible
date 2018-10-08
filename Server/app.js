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
const ejwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const adminPassword = "1";
const JWT_SECRET = "kdkid8w367nmo"

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const upload = multer({
    dest: "./tmp"
});

// app.get("/", express.static(path.join(__dirname, "./public")));
app.use(express.static('public'));

app.post("/api/login", (req, res) => {
    console.log(req.body.password);
    if (req.body.password === adminPassword) {
        console.log("success");
        res.json({
            jwt: jwt.sign({}, JWT_SECRET, { expiresIn: 60 * 60 })
        });
    } else {
        console.log("error");
        res.status(401).json({
            error: {
                message: 'Fel lösenord!'
            }
        });
    }
});
//ejwt({ secret: JWT_SECRET })
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

app.post("/api/recipe/edit", upload.single("file"), (req, res) => {

    //TODO: Om bilden är en jpeg så kommer den sparas som jpeg också!!

    const tempPath = req.file.path;
    const recipe = JSON.parse(req.body.recipe); // Didn't work without the stringify in frontend and parsing in backend
    const oldRecipeId = recipe.id;
    recipe.id = uuidv1().replace(/-/g, "");
    const fileExtention = path.extname(req.file.originalname);
    const targetPath = path.join(__dirname, "./public/" + recipe.id + fileExtention);

    for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].id === oldRecipeId) {
            recipes[i] = recipe;
            break;
        }
    }


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

app.post("/api/ingredients/add", (req, res) => {
    const ingredientName = req.body.ingredientName;
    const nutritionValues = req.body.nutritionValues;

    let formatedNutritionValues = nutritionValues.map(nutrient => {
        return {
            "Namn": nutrient.name,
            "Forkortning": nutrient.short,
            "Varde": nutrient.value
        }
    });

    const lastItemIndex = foodList.length - 1;
    const number = (parseInt(foodList[lastItemIndex].Nummer) + 1).toString();
    const food = {
        "Nummer": number,
        "Namn": ingredientName,
        "ViktGram": "100",
        "Naringsvarden": {
            "Naringsvarde": formatedNutritionValues
        }
    }

    foodList.push(food);

    fs.writeFile(foodPath, JSON.stringify(foodList), function (error) {
        if (error) console.log(error);
    });

    res
        .status(200)
        .contentType("text/plain")
});

app.get('/', function (req, res) {
    res.send('Hello World!')
})

app.get('/api/recipe/:id', function (request, response) {
    //loopa igenom recipes pch leta efter det med rätt id
    console.log(request.params.id);
    let recipe = recipes.filter(r => r.id === request.params.id);
    console.log(recipe);
    response.json(recipe);
});

app.get('/api/recipes/category/find/:category', function (request, response) {
    let recipeHits = recipes.filter(recipe => recipe.subCategories.includes(request.params.category));
    console.log(recipeHits);
    response.json(recipeHits);
});

app.get('/api/recipes/find/:searchWord', function (request, response) {
    let searchWord = request.params.searchWord.toLowerCase();

    let searchHits = [];
    for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (recipe.title.toLowerCase().includes(searchWord)) {
            searchHits.push(recipe);
            break;
        }

        for (let j = 0; j < recipe.description.length; j++) {
            const description = recipe.description[j];
            if (description.toLowerCase().includes(searchWord)) {
                searchHits.push(recipe);
                break;
            }
        }

        for (let j = 0; j < recipe.ingredients.length; j++) {
            const ingredient = recipe.ingredients[j];
            if (ingredient.displayName.toLowerCase().includes(searchWord)) {
                searchHits.push(recipe);
                break;
            }
        }
    }

    let filteredSearchHits = searchHits.filter((recipe, pos) => searchHits.indexOf(recipe) === pos);


    // console.log(searchWord);
    // let titleHits = recipes.filter(recipe => recipe.title.toLowerCase().includes(searchWord));
    // // console.dir(titleHits);
    // let descriptionHits = recipes.filter(recipe => recipe.description.filter(line => line.toLowerCase().includes(searchWord)));
    // console.dir(descriptionHits);
    // let ingredientsHits = recipes.filter(recipe => recipe.ingredients.filter(ingredient => ingredient.displayName.toLowerCase().includes(searchWord)));
    // console.dir(ingredientsHits);

    // let recipeHits = titleHits.concat(descriptionHits.concat(ingredientsHits));
    // let filteredRecipeHits = recipeHits.filter((recipe, pos) => recipeHits.indexOf(recipe) === pos);
    // console.dir(filteredRecipeHits);
    response.json(filteredSearchHits);
});

// app.get('/api/food/find/:id', function (request, response) {
app.get('/api/food/find/:id', function (request, response) {
    let searchHits = foodList
        .filter(food =>
            food.Namn
                .toLowerCase()
                .includes(request.params.id.toLowerCase())
        )
    response.json(searchHits);
});

app.listen(3000, () => console.log('Listening on port 3000'));