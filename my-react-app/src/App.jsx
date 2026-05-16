import { useState } from "react";

function Header({ name, title, location }) {
  return (
    <div style={{ backgroundColor: "#1a1a2e", padding: "40px", textAlign: "center" }}>
      <h1 style={{ color: "#e0a04f", fontSize: "48px" }}>{name}</h1>
      <p style={{ color: "#ccc", fontSize: "20px" }}>{title}</p>
      <p style={{ color: "#e0a04f", fontSize: "16px" }}>{location}</p>
    </div>
  );
}

function ServiceCard({ title, price, description }) {
  const [liked, setLiked] = useState(false);

  return (
    <div style={{
      backgroundColor: "white",
      padding: "30px",
      margin: "10px",
      width: "250px",
      borderBottom: "4px solid #e0a04f"
    }}>
      <h3 style={{ color: "#1a1a2e" }}>{title}</h3>
      <p style={{ color: "#666", fontSize: "14px" }}>{description}</p>
      <p style={{ color: "#e0a04f", fontSize: "24px", fontWeight: "bold" }}>${price}</p>
      <button onClick={() => setLiked(!liked)}>
        {liked ? "❤️ Saved" : "🤍 Save"}
      </button>
    </div>
  );
}

function App() {
  return (
    <div style={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Header
        name="Richard Williams"
        title="Web Developer & Digital Entrepreneur"
        location="SF Bay Area - Kenya"
      />

      <div style={{ padding: "40px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>My Services</h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
          <ServiceCard
            title="Business Website"
            price={500}
            description="Full professional website for your business"
          />
          <ServiceCard
            title="Landing Page"
            price={300}
            description="High converting single page site"
          />
          <ServiceCard
            title="Portfolio Site"
            price={400}
            description="Showcase your work professionally"
          />
          <ServiceCard
            title="SEO Optimization"
            price={250}
            description="Turn Visitors Into Clients"
            />
        </div>
      </div>
    </div>
  );
}

export default App;