import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  // Score
  const [score, setScore] = useState("");
  const [date, setDate] = useState("");
  const [scores, setScores] = useState([]);

  // Charity
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [userCharity, setUserCharity] = useState(null);

  // Draw
  const [drawNumbers, setDrawNumbers] = useState([]);
  const [matchResult, setMatchResult] = useState(null);

  // 🏆 Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await getUser();
    await fetchScores();
    await fetchCharities();
    await fetchUserCharity();
    await fetchLeaderboard(); // 👈 added
  };

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
  };

  const fetchScores = async () => {
    const { data } = await supabase
      .from("scores")
      .select("*")
      .order("date", { ascending: false });

    setScores(data || []);
  };

  const addScore = async () => {
    if (!score || !date) return alert("Enter score and date");

    if (score < 1 || score > 45) {
      return alert("Score must be between 1–45");
    }

    const { data } = await supabase.auth.getUser();

    const exists = scores.find((s) => s.date === date);
    if (exists) return alert("Score already exists");

    await supabase.from("scores").insert([
      {
        user_id: data.user.id,
        score,
        date,
      },
    ]);

    if (scores.length >= 5) {
      const oldest = scores[scores.length - 1];
      await supabase.from("scores").delete().eq("id", oldest.id);
    }

    fetchScores();
    setScore("");
    setDate("");
  };

  const fetchCharities = async () => {
    const { data } = await supabase.from("charities").select("*");
    setCharities(data || []);
  };

  const fetchUserCharity = async () => {
    const { data: userData } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("user_charity")
      .select("charity_id, charities(name)")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    setUserCharity(data);
  };

  const selectCharity = async () => {
    if (!selectedCharity) return alert("Select charity");

    const { data: userData } = await supabase.auth.getUser();

    await supabase
      .from("user_charity")
      .delete()
      .eq("user_id", userData.user.id);

    await supabase.from("user_charity").insert([
      {
        user_id: userData.user.id,
        charity_id: selectedCharity,
      },
    ]);

    alert("Charity saved!");
    fetchUserCharity();
  };

  // 🎯 DRAW
  const runDraw = async () => {
    let numbers = [];
    while (numbers.length < 5) {
      let num = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(num)) numbers.push(num);
    }

    setDrawNumbers(numbers);

    const { data } = await supabase.from("scores").select("score");
    const userScores = (data || []).map((s) => s.score);

    const matches = numbers.filter((n) =>
      userScores.includes(n)
    ).length;

    setMatchResult(matches);

    const { data: drawData } = await supabase
      .from("draws")
      .insert([{ numbers }])
      .select()
      .single();

    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("winners").insert([
      {
        user_id: userData.user.id,
        draw_id: drawData.id,
        match_count: matches,
      },
    ]);

    fetchLeaderboard(); // 🔥 update leaderboard after draw
  };

  // 🏆 LEADERBOARD FUNCTION
  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("winners")
      .select("match_count, user_id")
      .order("match_count", { ascending: false })
      .limit(10);

    if (error) console.error(error);
    else setLeaderboard(data || []);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px" }}>
      
      <h1 style={{ textAlign: "center" }}>Digital Heroes 🚀</h1>

      <p>Welcome: {user?.email}</p>
      <button onClick={logout}>Logout</button>

      <hr />

      {/* SCORE */}
      <h3>Add Score</h3>

      <input
        type="number"
        placeholder="Score (1–45)"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button onClick={addScore}>Add</button>

      <ul>
        {scores.map((s) => (
          <li key={s.id}>
            {s.score} — {s.date}
          </li>
        ))}
      </ul>

      <hr />

      {/* CHARITY */}
      <h3>Select Charity</h3>

      <select onChange={(e) => setSelectedCharity(e.target.value)}>
        <option value="">Choose charity</option>
        {charities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <button onClick={selectCharity}>Save</button>

      <p>Selected: {userCharity?.charities?.name || "None"}</p>

      <hr />

      {/* DRAW */}
      <h3>Run Draw</h3>
      <button onClick={runDraw}>Run</button>

      {drawNumbers.length > 0 && (
        <div>
          <p>Numbers: {drawNumbers.join(", ")}</p>
          <p>Matches: {matchResult}</p>
        </div>
      )}

      <hr />

      {/* 🏆 LEADERBOARD UI */}
      <h3>🏆 Leaderboard</h3>

      <ul>
        {leaderboard.map((l, i) => (
          <li key={i}>
            User: {l.user_id} — Matches: {l.match_count}
          </li>
        ))}
      </ul>

    </div>
  );
}