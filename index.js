const express = require("express");
const app = express();
const { connectMQTT, sendMessage } = require("./mqtt");
const {orders,deviceStatus} = require('./orderStore'); // or same file export
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
  async (req, res) => {
    const { machineId } = req.params;
   
    const { txn_id,  items } = req.body;
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
      status: "failed",
      createdAt: new Date(),
      webhookUrl
    };

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
  

    setTimeout(() => {
      // simulate spiral results
      console.log('Current Order Status before update:', orders[txn_id]);

      if(orders[txn_id].status =='duplicate'){
         return res.status(409).json({
        detail: `Duplicate txn_id: '${txn_id}' already exists. Please use a new, unique txn_id.`
      });
      }
      else if(orders[txn_id].status == "pending"){
     
  

      return res.status(200).json({
        tid: txn_id,
        machine_id: machineId,
        status: "pending",
  //      spiral_statuses: spiralStatuses
      });
      }
      else if(orders[txn_id].status == "completed"){
         return res.status(200).json({
        tid: txn_id, 
        machine_id: machineId,
        status: "completed",   
        spiral_statuses: orders[txn_id].spiral_statuses
         });
      }
      
      else{
        return res.status(200).json({
          tid: txn_id,
          machine_id: machineId,
          status: "failed",
         // spiral_statuses: spiralStatuses
        });
      }
      
    }, 4000);
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
