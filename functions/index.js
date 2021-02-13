const functions = require("firebase-functions");
const fs = require("fs");
const express = require("express");
const router = express.Router();
const cors = require("cors");
const bodyParser = require("body-parser");
const expressMultipartFileParser = require("express-multipart-file-parser");
const firebaseAdmin = require("firebase-admin");
const privateKey = require("./private.json");
const store = "fir-firebase-medium.appspot.com"
firebaseAdmin.default.initializeApp({
    credential: firebaseAdmin.default.credential.cert(privateKey),
    storageBucket: store
});
const bucket = firebaseAdmin.default.storage().bucket();
const app = express();
const start = async () => {
    try {
        app.use(cors());
        app.use(bodyParser.json({ limit: "50mb" }));
        app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
        app.use(expressMultipartFileParser.fileParser({
            rawBodyOptions: {
                limit: '50mb',
            },
        }));
        router.post('/upload',async (req, res)  => {
            const file = req.files[0]
            const ext = file.mimetype.split("/")[1];
            const timestamp = Date.now();
            const tempFileName = `${timestamp}.${ext}`;
            const tempFilePath = `/tmp/${tempFileName}`;
            fs.writeFileSync(tempFilePath, file.buffer);
            await bucket.upload(tempFilePath, {
                gzip: false,
                destination: tempFileName,
                public: true,
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        firebaseStorageDownloadTokens: timestamp,
                    },
                    cacheControl: "public, max-age=31536000",
                },
            });
            fs.unlinkSync(tempFilePath);
            const url = `https://firebasestorage.googleapis.com/v0/b/${store}/o/${tempFileName}?alt=media&token=${timestamp}`;
            res.status(200).json({
                field: file.fieldname,
                originalName: file.originalname,
                mimeType: file.mimetype,
                ext,
                timestamp,
                url,
            })
        });
        router.get('/',async (req, res)  => {
            res.status(200).json({ api: '1.0.0' })
        });
        app.use('/',router)
        app.listen(3000, function () {
            console.log("App is listening on port 3000!");
        });
    }
    catch (err) {
        console.log(err);
    }
};
start();
exports.api = functions.region('asia-northeast1').https.onRequest(app);
