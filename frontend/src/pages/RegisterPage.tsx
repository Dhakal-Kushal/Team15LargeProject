import { useState } from "react";

function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const doRegister = async () => {
    const response = await fetch("http://174.138.45.229:5000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        login,
        password,
      }),
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
    } else {
      alert("Registration successful");
      window.location.href = "/";
    }
  };

  return (
    <div>
      <h1>Register</h1>

      <input placeholder="First Name" onChange={e => setFirstName(e.target.value)} />
      <br />

      <input placeholder="Last Name" onChange={e => setLastName(e.target.value)} />
      <br />

      <input placeholder="Username" onChange={e => setLogin(e.target.value)} />
      <br />

      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
      <br />

      <button onClick={doRegister}>Register</button>

      <br /><br />
      <a href="/">Back to Login</a>
    </div>
  );
}

export default RegisterPage;
