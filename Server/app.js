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
const Jimp = require('jimp');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const upload = multer({
    dest: "./tmp"
});

const removeImage = function (targetPath) {
    fs.unlink(targetPath, (err) => {
        if (err) throw err;
    });
}

const convertImageToJPG = function (targetPath, recipe) {
    Jimp.read(targetPath, (err, file) => {
        if (err) throw err;
        file
            .write(path.join(__dirname, "./public/" + recipe.id + ".jpg"));
    });
}

const saveRecipes = function (recipes, res) {
    fs.writeFile(recipesPath, JSON.stringify(recipes), function (error) {
        if (error) console.log(error);
        else res.status(200).send("Success");
    });
}

// app.get("/", express.static(path.join(__dirname, "./public")));
app.use(express.static('public'));

// Skulle kunna haft en "blacklist med utloggade tokens för att försäkra mig om att ingen stulit ett 
// token och hinner använda det innan det expirar"
app.post("/api/login", (req, res) => {
    if (req.body.password === adminPassword) {
        console.log("success");
        res.json({
            jwt: jwt.sign({}, JWT_SECRET, { expiresIn: 60 * 60 })
        });
    } else {
        console.log("error");
        res.status(401).json({
            error: {
                message: 'Wrong password!'
            }
        });
    }
});

app.get("/api/token", ejwt({ secret: JWT_SECRET }), (req, res) => {
    res.status(200).send("Success");
});

//ejwt({ secret: JWT_SECRET })
app.post("/api/recipe/add", ejwt({ secret: JWT_SECRET }), upload.single("file"), (req, res) => {

    const tempPath = req.file.path;
    const recipe = JSON.parse(req.body.recipe); // Didn't work without the stringify in frontend and parsing in backend
    recipe.id = uuidv1().replace(/-/g, "");
    const fileExtention = path.extname(req.file.originalname);
    const targetPath = path.join(__dirname, "./public/" + recipe.id + fileExtention);

    recipes.push(recipe);

    fs.rename(tempPath, targetPath, err => {
        if (err) return handleError(err, res);
    });

    if (fileExtention !== ".jpg") {
        convertImageToJPG(targetPath, recipe);
        removeImage(targetPath);
    }

    saveRecipes(recipes, res);

    // res
    //     .status(200)
    //     .contentType("text/plain")
    //     .end("File uploaded!");
});

app.get('/api/recipe/:id/remove', ejwt({ secret: JWT_SECRET }), function (req, res) {
    //loopa igenom recipes pch leta efter det med rätt id
    const recipeIndex = recipes.map(recipe => { return recipe.id; }).indexOf(req.params.id);
    const targetPath = path.join(__dirname, "./public/" + req.params.id + ".jpg");

    recipes.splice(recipeIndex, 1);
    removeImage(targetPath);
    saveRecipes(recipes, res);
});

app.post("/api/recipe/edit", ejwt({ secret: JWT_SECRET }), upload.single("file"), (req, res) => {

    const tempPath = req.file.path;
    const recipe = JSON.parse(req.body.recipe); // Didn't work without the stringify in frontend and parsing in backend
    const oldRecipeId = recipe.id;
    recipe.id = uuidv1().replace(/-/g, "");
    const fileExtention = path.extname(req.file.originalname);
    const targetPath = path.join(__dirname, "./public/" + recipe.id + fileExtention);
    const oldTargetPath = path.join(__dirname, "./public/" + oldRecipeId + ".jpg");

    for (let i = 0; i < recipes.length; i++) {
        if (recipes[i].id === oldRecipeId) {
            recipes[i] = recipe;
            break;
        }
    }

    //TODO: Vad exakt händer här?
    fs.rename(tempPath, targetPath, err => {
        if (err) return handleError(err, res);
    });

    if (fileExtention !== ".jpg") {
        convertImageToJPG(targetPath, recipe);
        removeImage(targetPath);
    }

    saveRecipes(recipes, res);
    removeImage(oldTargetPath);

    // res
    //     .status(200)
    //     .contentType("text/plain")
    //     .end("File uploaded!");
});

app.post("/api/ingredients/add", ejwt({ secret: JWT_SECRET }), (req, res) => {
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
    let recipe = recipes.filter(r => r.id === request.params.id);
    response.json(recipe);
});

app.get('/api/recipes/category/find/:category', function (request, response) {
    let recipeHits = recipes.filter(recipe => recipe.subCategories.includes(request.params.category));
    response.json(recipeHits);
});

app.get('/api/recipes/find/:searchWord', function (request, response) {
    let searchWord = request.params.searchWord.toLowerCase();
    let searchHits = [];

    for (let i = 0; i < recipes.length; i++) {
        let found = false;
        const recipe = recipes[i];

        if (recipe.title.toLowerCase().includes(searchWord)) {
            searchHits.push(recipe);
            found = true;
        }

        if (!found) {

            for (let j = 0; j < recipe.description.length && !found; j++) {
                const description = recipe.description[j];
                if (description.toLowerCase().includes(searchWord)) {
                    searchHits.push(recipe);
                    found = true;
                }
            }

            if (!found) {

                for (let k = 0; k < recipe.ingredients.length && !found; k++) {
                    const ingredient = recipe.ingredients[k];
                    if (ingredient.displayName.toLowerCase().includes(searchWord)) {
                        searchHits.push(recipe);
                        found = true;
                    }
                }
            }
        }
    }

    let filteredSearchHits = searchHits.filter((recipe, pos) => searchHits.indexOf(recipe) === pos);

    response.json(filteredSearchHits);
});

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