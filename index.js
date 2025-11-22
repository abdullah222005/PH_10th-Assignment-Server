const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 1111;

//middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://the-book-heaven_DB:dyp4h4hJR9xvuSre@cluster0.gh1jtid.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("smart server is running..!!!");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("the-book-heaven_DB");
    const booksCollection = db.collection("all-books");
    const usersCollection = db.collection("users");
    const personalBookCollection = db.collection("myBooks");
    const usersComment = db.collection("comments");

    // Users API
    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const email = req.body.email;
        const query = { email: email };
        const existingUser = await usersCollection.findOne(query);
        if (existingUser) {
          res.send({ message: "user already exists." });
        } else {
          const result = await usersCollection.insertOne(newUser);
          res.send(result);
        }
      } catch (error) {
        console.error("Users POST error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const cursor = usersCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Users GET error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // All Books API
    app.get("/all-books", async (req, res) => {
      try {
        const cursor = booksCollection.find().sort({ rating: -1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("All books error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/latest-books", async (req, res) => {
      try {
        const cursor = booksCollection.find().sort({ _id: -1 }).limit(6);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Latest books error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.post("/all-books", async (req, res) => {
      try {
        const newBook = req.body;
        const result = await booksCollection.insertOne(newBook);
        res.send(result);
      } catch (error) {
        console.error("Add book error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Book Details API
    app.get("/book-details/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        let result = await booksCollection.findOne(query);

        if (!result) {
          result = await personalBookCollection.findOne(query);
        }

        res.send(result);
      } catch (error) {
        console.error("Book details error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Comments API
    app.post("/book-details/:id/comments", async (req, res) => {
      try {
        const bookId = req.params.id;
        const { userName, userEmail, comment, userPhoto } = req.body;

        if (!comment || !userName || !userEmail) {
          return res.status(400).send({ error: "All fields are required" });
        }

        const newComment = {
          userName,
          userEmail,
          userPhoto: userPhoto || null,
          comment,
          bookId,
          createdAt: new Date(),
        };

        const commentsCollection = db.collection("comments");
        const result = await commentsCollection.insertOne(newComment);
        res.send(result);
      } catch (error) {
        console.error("Add comment error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/book-details/:id/comments", async (req, res) => {
      try {
        const bookId = req.params.id;
        const commentsCollection = db.collection("comments");
        const comments = await commentsCollection
          .find({ bookId })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(comments);
      } catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.delete("/comments/:id", async (req, res) => {
      try {
        const commentId = req.params.id;
        const commentsCollection = db.collection("comments");
        const result = await commentsCollection.deleteOne({
          _id: new ObjectId(commentId),
        });
        res.send(result);
      } catch (error) {
        console.error("Delete comment error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Update book API - COMPLETELY FIXED
    app.patch("/update-book/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedBook = req.body;

        console.log("Update request for ID:", id);
        console.log("Update data:", updatedBook);

        // Remove _id from update data if it exists
        delete updatedBook._id;

        const query = { _id: new ObjectId(id) };

        // Try updating in main collection first
        let result = await booksCollection.updateOne(query, {
          $set: updatedBook,
        });

        console.log("Main collection result:", result);

        // If not found in main collection, try personal collection
        if (result.matchedCount === 0) {
          result = await personalBookCollection.updateOne(query, {
            $set: updatedBook,
          });
          console.log("Personal collection result:", result);
        }

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Book not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/update-book/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        let result = await booksCollection.findOne(query);

        if (!result) {
          result = await personalBookCollection.findOne(query);
        }

        if (!result) {
          return res.status(404).send({ error: "Book not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Personal Book Collection API
    app.get("/myBooks", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const personalBooks = await personalBookCollection
          .find({ userEmail: email })
          .sort({ rating: -1 })
          .toArray();
        const mainCollection = await booksCollection
          .find({ userEmail: email })
          .sort({ rating: -1 })
          .toArray();
        const allBooks = [...personalBooks, ...mainCollection];
        res.send(allBooks);
      } catch (error) {
        console.error("Fetch myBooks error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    // Delete book API - FIXED
    app.delete("/myBooks/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log("Delete request for ID:", id);

        const query = { _id: new ObjectId(id) };

        // Try deleting from personal collection first
        let result = await personalBookCollection.deleteOne(query);
        console.log("Personal collection delete result:", result);

        // If not found in personal collection, try main collection
        if (result.deletedCount === 0) {
          result = await booksCollection.deleteOne(query);
          console.log("Main collection delete result:", result);
        }

        res.send(result);
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
