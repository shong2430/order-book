import React from "react";
import OrderBook from "./components/OrderBook";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>即時訂單簿</h1>
      <OrderBook />
    </div>
  );
}
