"use client";

import React, { useEffect, useRef, useState } from "react";

export default function OrderBook() {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [lastPrice, setLastPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const lastOrderBookRef = useRef({ bids: [], asks: [] });
  const throttleRef = useRef(false);
  const [highlightRows, setHighlightRows] = useState({ bids: [], asks: [] });
  const [highlightCells, setHighlightCells] = useState({ bids: [], asks: [] });

  useEffect(() => {
    const orderSocket = new WebSocket("wss://ws.btse.com/ws/oss/futures");
    const tradeSocket = new WebSocket("wss://ws.btse.com/ws/futures");

    orderSocket.onopen = () => {
      orderSocket.send(
        JSON.stringify({ op: "subscribe", args: ["update:BTCPFC"] })
      );
    };

    tradeSocket.onopen = () => {
      tradeSocket.send(
        JSON.stringify({ op: "subscribe", args: ["tradeHistoryApi:BTCPFC"] })
      );
    };

    orderSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.topic?.startsWith("update:BTCPFC") && message.data) {
        const newBids = (message.data.bids || [])
          .slice(0, 8)
          .map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          }));
        const newAsks = (message.data.asks || [])
          .slice(0, 8)
          .map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          }));

        while (newBids.length < 8) newBids.push({ price: 0, size: 0 });
        while (newAsks.length < 8) newAsks.push({ price: 0, size: 0 });

        const last = lastOrderBookRef.current;

        const getHighlightFlags = (newOrders, oldOrders) =>
          newOrders.map((order) => {
            if (order.price === 0) return false;
            const isNewPrice = !oldOrders.some((o) => o.price === order.price);
            return isNewPrice;
          });

        const getCellHighlights = (newOrders, oldOrders) =>
          newOrders.map((order) => {
            if (order.price === 0 || !Number.isFinite(order.size)) return null;
            const old = oldOrders.find((o) => o.price === order.price);
            if (!old || !Number.isFinite(old.size)) return null;
            if (order.size > old.size) return "green";
            if (order.size < old.size) return "red";
            return null;
          });

        if (
          JSON.stringify(newBids) !== JSON.stringify(last.bids) ||
          JSON.stringify(newAsks) !== JSON.stringify(last.asks)
        ) {
          lastOrderBookRef.current = { bids: newBids, asks: newAsks };

          if (!throttleRef.current) {
            throttleRef.current = true;
            setOrderBook({ bids: newBids, asks: newAsks });
            setHighlightRows({
              bids: getHighlightFlags(newBids, last.bids),
              asks: getHighlightFlags(newAsks, last.asks),
            });
            setHighlightCells({
              bids: getCellHighlights(newBids, last.bids),
              asks: getCellHighlights(newAsks, last.asks),
            });

            setTimeout(() => {
              throttleRef.current = false;
              setHighlightRows({
                bids: Array(8).fill(false),
                asks: Array(8).fill(false),
              });
              setHighlightCells({
                bids: Array(8).fill(null),
                asks: Array(8).fill(null),
              });
            }, 200);
          }
        }
      }
    };

    tradeSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (Array.isArray(message.data)) {
        const latestTrade = message.data[0];
        const newPrice = parseFloat(latestTrade.price);
        setPrevPrice(lastPrice);
        setLastPrice(newPrice);
      }
    };

    return () => {
      orderSocket.close();
      tradeSocket.close();
    };
  }, [lastPrice]);

  const { bids, asks } = orderBook;
  const totalBidSize = bids.reduce((sum, item) => sum + item.size, 0);
  const totalAskSize = asks.reduce((sum, item) => sum + item.size, 0);

  const rowStyle = (highlighted, side) => {
    let bg = "transparent";
    if (highlighted && side === "bids") bg = "rgba(0, 177, 93, 0.12)";
    if (highlighted && side === "asks") bg = "rgba(255, 90, 90, 0.12)";

    return {
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      padding: "2px 4px",
      transition: "background-color 0.2s ease",
      cursor: "pointer",
      backgroundColor: bg,
      fontSize: 12,
      height: 24,
      alignItems: "center",
    };
  };

  const renderLastPrice = () => {
    let color = "#F0F4F8";
    let bg = "rgba(134, 152, 170, 0.12)";
    let arrow = "";
    if (prevPrice && lastPrice) {
      if (lastPrice > prevPrice) {
        color = "#00b15d";
        bg = "rgba(16, 186, 104, 0.12)";
        arrow = "↑";
      } else if (lastPrice < prevPrice) {
        color = "#FF5B5A";
        bg = "rgba(255, 90, 90, 0.12)";
        arrow = "↓";
      }
    }
    return (
      <div
        style={{
          textAlign: "center",
          padding: "6px 0",
          fontWeight: "bold",
          color,
          backgroundColor: bg,
        }}
      >
        {lastPrice ? `${lastPrice.toLocaleString()} ${arrow}` : "-"}
      </div>
    );
  };

  const renderCellBackground = (type) => {
    if (!type) return "transparent";
    if (type === "green") return "rgba(0, 177, 93, 0.5)";
    if (type === "red") return "rgba(255, 91, 90, 0.5)";
    return "transparent";
  };

  return (
    <div
      style={{
        backgroundColor: "#131B29",
        color: "#F0F4F8",
        width: 280,
        fontFamily: "monospace",
        fontSize: 14,
        padding: "8px",
        borderRadius: 6,
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>Order Book</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "4px 4px",
          color: "#8698aa",
          fontSize: 12,
        }}
      >
        <div>Price (USD)</div>
        <div style={{ color: "#F0F4F8" }}>Size</div>
        <div style={{ color: "#F0F4F8" }}>Total</div>
      </div>

      {asks.map((ask, i) => {
        const cumulative = asks
          .slice(0, i + 1)
          .reduce((sum, item) => sum + item.size, 0);
        const ratio = totalAskSize > 0 ? cumulative / totalAskSize : 0;
        return (
          <div
            key={`ask-${i}`}
            style={{
              ...rowStyle(highlightRows.asks[i], "asks"),
              color: ask.price > 0 ? "#FF5B5A" : "#444",
            }}
          >
            <div style={{ flex: 1, textAlign: "right", zIndex: 1 }}>
              {ask.price ? ask.price.toLocaleString() : "-"}
            </div>
            <div
              style={{
                flex: 1,
                textAlign: "right",
                zIndex: 1,
                backgroundColor: renderCellBackground(highlightCells.asks[i]),
                color: "#F0F4F8",
              }}
            >
              {ask.size ? ask.size.toLocaleString() : "-"}
            </div>
            <div
              style={{
                flex: 1,
                textAlign: "right",
                zIndex: 1,
                color: "#F0F4F8",
              }}
            >
              {cumulative ? Math.round(cumulative).toLocaleString() : "-"}
            </div>
            {ask.price > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(255, 90, 90, 0.12)",
                  width: `${ratio * 100}%`,
                  zIndex: 0,
                }}
              />
            )}
          </div>
        );
      })}

      {renderLastPrice()}

      {bids.map((bid, i) => {
        const cumulative = bids
          .slice(0, i + 1)
          .reduce((sum, item) => sum + item.size, 0);
        const ratio = totalBidSize > 0 ? cumulative / totalBidSize : 0;
        return (
          <div
            key={`bid-${i}`}
            style={{
              ...rowStyle(highlightRows.bids[i], "bids"),
              color: bid.price > 0 ? "#00b15d" : "#444",
            }}
          >
            <div style={{ flex: 1, textAlign: "right", zIndex: 1 }}>
              {bid.price ? bid.price.toLocaleString() : "-"}
            </div>
            <div
              style={{
                flex: 1,
                textAlign: "right",
                zIndex: 1,
                backgroundColor: renderCellBackground(highlightCells.bids[i]),
                color: "#F0F4F8",
              }}
            >
              {bid.size ? bid.size.toLocaleString() : "-"}
            </div>
            <div
              style={{
                flex: 1,
                textAlign: "right",
                zIndex: 1,
                color: "#F0F4F8",
              }}
            >
              {cumulative ? Math.round(cumulative).toLocaleString() : "-"}
            </div>
            {bid.price > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(16, 186, 104, 0.12)",
                  width: `${ratio * 100}%`,
                  zIndex: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
