import { useState, useEffect } from "react";


function App() {
  const [soil, setSoil] = useState("");
  const [result, setResult] = useState("");
  const [weather, setWeather] = useState({});

  // 🌦️ Auto fetch weather (hardcoded city from backend)
  useEffect(() => {
    const getWeather = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/weather");
        const data = await res.json();
        setWeather(data);
      } catch (err) {
        console.log(err);
      }
    };

    getWeather();
  }, []);

  // 🤖 Prediction
  const handlePredict = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          soil_moisture: Number(soil),
          temperature: weather.temperature || 30,
          humidity: weather.humidity || 60,
          rainfall: 0
        })
      });

      const data = await res.json();

      if (data.prediction !== undefined) {
        setResult(
          data.prediction === 1
            ? "💧 Irrigation Needed"
            : "✅ No need of Irrigation"
        );
      } else {
        setResult("Error");
      }

    } catch (err) {
      console.log(err);
      setResult("Server error");
    }
  };

  return (
    <div className="dashboard">

     

      <h1 className="title">Smart Irrigation Dashboard</h1> <br></br>

      <div className="grid">

        {/* 🌦️ Weather */}
        <div className="card">
          <h2>Weather</h2>
          <p>🌡 Temp: {weather?.temperature ?? "--"}°C</p>
          <p>💧 Humidity: {weather?.humidity ?? "--"}%</p>
          <p>☀️ Condition: {weather?.condition ?? "--"}</p>
        </div>

        {/* 🌱 Soil */}
        <div className="card">
          <h2>Soil Sensor</h2>

          <input
            type="number"
            placeholder="Enter Soil Moisture"
            value={soil}
            onChange={(e) => setSoil(e.target.value)}
          />

          <button onClick={handlePredict}>Predict</button>
        </div>

        {/* 💧 Result */}
        <div className="card">
          <h2>Prediction</h2>
          <p>{result || "Enter value..."}</p>
        </div>

      </div>
    </div>
  );
}

export default App;