const express = require("express");
const app = express();
const dotenv = require("dotenv");
const { connectMQTT,  sendMessage } = require("./mqtt");
const {orders,deviceStatus} = require('./orderStore'); // or same file export
const cors = require('cors');
require('./mqttListener');

dotenv.config();

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
  async (req, res) => {
    const { machineId } = req.params;
   
    const { txn_id,  items } = req.body;
    let time;
    console.log(process.env.WAIT_TIME);
    if(process.env.WAIT_TIME == 1){
      time=2000;
    }
    else{
      time=((15000*items.length)+6000);
    }
    console.log(time);
     // time=2000;
      //sendMessage(
      //`HB/${machineId}`,
      //`*FW?#`
    //);
    const webhookUrl = req.header("Webhook-Url"); // optional
    
   // setTimeout(()=>{
  

    // ---- Validation ----
    if (!txn_id || !items) {
      return res.status(400).json({
        error: "Missing or invalid request parameters"
      });
    }

    // ---- DUPLICATE TXN CHECK ----
   

    // ---- CREATE ORDER ----
    orders[txn_id] = {
      tid: txn_id,
      machine_id:machineId,
      items,
      status: "No Response",
      createdAt: new Date(),
      webhookUrl
    };
    console.log(orders[txn_id]);

    // ---- SEND MQTT VEND COMMAND ----
    sendMessage(
      `HB/${machineId}`,
      `*VEND,${txn_id},PAYTM,${items.length*100},${txn_id}#`
    );

    // ==========================
    // ?? ASYNC (WEBHOOK) FLOW
    // ==========================
    if (webhookUrl) {
      return res.status(202).json({
        status: "pending",
        tid: txn_id,
        machine_id: machineId,
        estimated_completion_in_seconds: 20
      });
    }

    // ==========================
    // ?? SYNC FLOW
    // ==========================

    if (process.env.WAIT_TIME == 2) {
      // Poll until status is completed, failed, or duplicate, with timeout
      const pollInterval = setInterval(() => {
        const currentStatus = orders[txn_id].status;
        console.log('Polling Order Status:', currentStatus);

        if (currentStatus === 'duplicate') {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          return res.status(409).json({
            detail: `Duplicate txn_id: '${txn_id}' already exists. Please use a new, unique txn_id.`
          });
        } else if (currentStatus === 'completed') {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          return res.status(200).json({
            tid: txn_id,
            machine_id: machineId,
            status: "completed",
            spiral_statuses: orders[txn_id].spiral_statuses
          });
        } else if (currentStatus === 'failed') {
          clearInterval(pollInterval);
          clearTimeout(timeout);
          return res.status(200).json({
            tid: txn_id,
            machine_id: machineId,
            status: "failed",
            spiral_statuses: orders[txn_id].spiral_statuses
          });
        }
        // If still pending, continue polling
      }, 1000); // Poll every 1 second

      // Timeout after calculated time
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        return res.status(200).json({
          tid: txn_id,
          machine_id: machineId,
          status: "No Response"
        });
      }, time);
    } else {
      // Existing timeout logic for other WAIT_TIME values
      setTimeout(() => {
        // simulate spiral results
        console.log('Current Order Status before update:', orders[txn_id]);

        if (orders[txn_id].status === 'duplicate') {
          return res.status(409).json({
            detail: `Duplicate txn_id: '${txn_id}' already exists. Please use a new, unique txn_id.`
          });
        } else if (orders[txn_id].status === "pending") {
          return res.status(200).json({
            tid: txn_id,
            machine_id: machineId,
            status: "pending",
            estimated_completion_in_seconds: 15 * items.length + 6
          });
        } else if (orders[txn_id].status === "completed") {
          return res.status(200).json({
            tid: txn_id,
            machine_id: machineId,
            status: "completed",
            spiral_statuses: orders[txn_id].spiral_statuses
          });
        } else {
          return res.status(200).json({
            tid: txn_id,
            machine_id: machineId,
            status: "No Response"
          });
        }
      }, time); // simulate delay based on items length
    }
    // },2000);
  }
  
);


// ---- GET TRANSACTION STATUS ----
app.get(
  "/api/v1/transactions/:txnId",
  apiKeyAuth,
  (req, res) => {
    const { txnId } = req.params;

    const transaction = orders[txnId];
    if(transaction)
{
    sendMessage(`HB/${transaction.machine_id}`, `*MVSTATUS?#`);
}
   
    if (!transaction) {
      return res.json({
        detail: "Transaction not found"
      });
    }
    setTimeout(() => {
      if(orders[txnId].status == "pending"){
         const { items,spiral_statuses, ...transactionWithoutItems } = transaction;
          return res.status(200).json(transactionWithoutItems);
      }
      else{
    const { items, ...transactionWithoutItems } = transaction;
    return res.status(200).json(transactionWithoutItems);
      }
     
    }, 2000);


     
  }
);

// ---- GET Device STATUS ----
app.get(
  "/api/v1/machines/:txnId/status",
  apiKeyAuth,
  (req, res) => {
     const { txnId } = req.params;
      const lastHeartBeatTime= deviceStatus[txnId];
      let status="ONLINE";
      if (!lastHeartBeatTime) {
      status="OFFLINE";
    
    }
    
    if(lastHeartBeatTime < new Date(Date.now() - 5 * 60 * 1000).toISOString()){
      status="OFFLINE";
     
    }
    
  return res.json({
    success: true,
    is_online: status == "ONLINE" ? true : false,
    status: status == "ONLINE" ? "active" : "inactive",
    last_heartbeat_at: lastHeartBeatTime || null
  });
}

  
    
  
);

// ---- START SERVER ----
const PORT = 9090;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectMQTT();
});
