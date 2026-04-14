import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LoggedInName() {
    const navigate = useNavigate();
    const _ud = localStorage.getItem('user_data');

    // navigate() cannot be called during render — must be inside useEffect
    useEffect(() => {
        if (!_ud) {
            navigate('/login');
        }
    }, [_ud, navigate]);

    if (!_ud) return null;

    const ud = JSON.parse(_ud);
    const firstName: string = ud.firstName;
    const lastName: string = ud.lastName;

    function doLogout(event: any): void {
        event.preventDefault();
        localStorage.removeItem('user_data');
        localStorage.removeItem('token_data');
        navigate('/login');
    }

    return (
        <div id="loggedInDiv">
            <span id="userName">Logged In As {firstName} {lastName}</span><br />
            <button type="button" id="logoutButton" className="buttons"
                onClick={doLogout}> Log Out </button>
        </div>
    );
}

export default LoggedInName;