"use client";

import { useState } from "react";
import { Wand2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

export default function TestVeoPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // For polling
  const [polling, setPolling] = useState(false);
  const [pollLogs, setPollLogs] = useState<string[]>([]);

  const generateVideo = async () => {
    if (!prompt) return;
    setLoading(true);
    setError("");
    setResult(null);
    setPollLogs([]);
    setPolling(false);
    setVideoUrl(null);

    try {
      const res = await fetch("/api/test-veo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate video");
      
      setResult(data);
      if (data.operationName) {
        startPolling(data.operationName);
      }
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  };

  const startPolling = async (operationName: string) => {
    setPolling(true);
    let isDone = false;
    
    const addLog = (msg: string) => {
        setPollLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    };
    
    addLog(`Started polling operation: ${operationName}`);

    while (!isDone) {
      await new Promise(r => setTimeout(r, 10000)); // Poll every 10s
      addLog("Checking status...");
      
      try {
        const res = await fetch(`/api/test-veo?operationName=${encodeURIComponent(operationName)}`);
        const data = await res.json();
        
        if (!res.ok) {
            addLog(`Error during polling: ${data.error || data.detail}`);
            isDone = true;
            break;
        }

        if (data.done) {
            isDone = true;
            addLog(`Operation complete!`);
            setResult((prev: any) => ({ ...prev, completedData: data.response }));
            
            if (data.response?.error) {
              const errMsg = data.response.error.message || "Unknown error occurred during generation.";
              setError(`Video generation failed: ${errMsg}`);
              addLog(`Operation failed: ${errMsg}`);
              break;
            }
            
            
            try {
              let uri = "";
              const responseData = data.response;
              
              if (responseData?.response?.videos?.[0]?.bytesBase64Encoded) {
                uri = `data:video/mp4;base64,${responseData.response.videos[0].bytesBase64Encoded}`;
              } else if (responseData?.videos?.[0]?.bytesBase64Encoded) {
                uri = `data:video/mp4;base64,${responseData.videos[0].bytesBase64Encoded}`;
              } else if (responseData?.response?.artifacts?.[0]?.uri) {
                uri = responseData.response.artifacts[0].uri;
              } else if (responseData?.artifacts?.[0]?.uri) {
                uri = responseData.artifacts[0].uri;
              }
              
              if (uri && (uri.toLowerCase().endsWith('.mp4') || uri.startsWith('data:video/'))) {
                setVideoUrl(uri);
                addLog(`Video preview generated successfully!`);
              } else if (uri) {
                addLog(`Found output but format was unexpected.`);
              }
            } catch (err: any) {
              addLog(`Error parsing video URI: ${err.message}`);
            }
        } else if (data.pollLogs) {
            // Log whatever the server tells us
            data.pollLogs.forEach((l: string) => addLog(`Server: ${l}`));
        } else {
            addLog("Still processing...");
        }
      } catch (e: any) {
        addLog(`Fetch error: ${e.message}`);
        isDone = true;
      }
    }
    setPolling(false);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem" }} className="animate-fade-in">
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Veo 3.1 Tester</h1>
      <p style={{ color: "var(--muted-foreground)", marginBottom: "2rem" }}>
        Directly test the Vertex AI Veo 3.1 video generation API.
      </p>

      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <label className="label">Video Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A cinematic slow zoom of a sunset over the ocean..."
          className="input-field"
          rows={4}
          style={{ resize: "vertical", marginBottom: "1rem" }}
        />
        <button 
          onClick={generateVideo} 
          disabled={loading || !prompt || polling}
          className="btn-primary" 
          style={{ width: "100%" }}
        >
          {loading ? <><RefreshCw size={16} className="animate-spin" /> Starting...</> : <><Wand2 size={16} /> Generate Video</>}
        </button>
      </div>

      {error && (
        <div style={{ padding: "1rem", background: "rgba(220,38,38,0.1)", color: "#DC2626", borderRadius: 8, marginBottom: "1.5rem" }}>
          <AlertCircle size={18} style={{ display: "inline", marginRight: "0.5rem", verticalAlign: "middle" }} />
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CheckCircle size={18} style={{ color: "#16A34A" }} /> Generation Started
          </h2>
          <pre style={{ background: "var(--muted)", padding: "1rem", borderRadius: 6, fontSize: "0.75rem", overflowX: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {videoUrl && (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wand2 size={18} style={{ color: "var(--primary)" }} /> Generated Video
          </h2>
          <video 
            src={videoUrl} 
            controls 
            autoPlay
            loop
            style={{ width: "100%", borderRadius: 8, background: "#000" }} 
          />
        </div>
      )}

      {(polling || pollLogs.length > 0) && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {polling ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} style={{ color: "#16A34A" }} />}
            Polling Status
          </h2>
          <div style={{ background: "var(--muted)", padding: "1rem", borderRadius: 6, fontSize: "0.75rem", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: 300, overflowY: "auto" }}>
            {pollLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
            {polling && <div className="animate-pulse">_</div>}
          </div>
        </div>
      )}
    </div>
  );
}
