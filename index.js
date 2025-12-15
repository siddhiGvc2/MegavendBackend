const express = require("express");
const app = express();
const { connectMQTT, sendMessage } = require("./mqtt");
const orders = require('./orderStore'); // or same file export
const cors = require('cors');
require('./mqttListener');

app.use(cors('*'));
app.use(express.json());

// ---- CONFIG ----
const API_KEY = "client-hungerbox-api-key-12345";



// ---- API KEY MIDDLEWARE ----
function apiKeyAuth(req, res, next) {
  const apiKey = req.header("Api-Key");
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: "Invalid API Key" });
  }
  next();
}

// ---- CREATE ORDER ----
app.post(
  "/api/v1/machines/:machineId/orders",
  apiKeyAuth,
  (req, res) => {
    const { machineId } = req.params;
    const { txn_id, amount, items } = req.body;

    if (!txn_id || !amount || !items) {
      return res.status(400).json({ error: "Missing fields" });
    }

     orders[txn_id] = {
      machineId,
      txn_id,
      amount,
      items,
      status: "FAILED",
      createdAt: new Date()
    };

    console.log(`Order ${txn_id} created for machine ${machineId}`,orders[txn_id]);

    sendMessage(`HB/${machineId}`, payload = `*VEND,${txn_id},PAYTM,${amount},${txn_id}#`);

    setTimeout(() => {
            console.log('Simulating order success for', txn_id,orders[txn_id].status);
           
            res.json({
            message: "Order created",
            txn_id,
            machineId,
            status: orders[txn_id].status
            });
        },4000);
  }
);

// ---- GET TRANSACTION STATUS ----
app.get(
  "/api/v1/transactions/:txnId",
  apiKeyAuth,
  (req, res) => {
    const { txnId } = req.params;

    const transaction = orders[txnId];

    if (!transaction) {
      return res.json({
        txn_id: txnId,
        status: "NOT_FOUND"
      });
    }

    res.json(transaction);
  }
);

// ---- START SERVER ----
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMQTT();
});
