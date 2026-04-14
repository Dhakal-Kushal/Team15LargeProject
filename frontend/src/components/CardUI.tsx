import React, { useState } from 'react';

function CardUI()
{
    let _ud : any = localStorage.getItem('user_data');
    let ud = JSON.parse(_ud);
    let userId : string = ud.id;

    const [message, setMessage] = useState('');
    const [searchResults, setResults] = useState('');
    const [cardList, setCardList] = useState<any[]>([]);
    const [search, setSearchValue] = React.useState('');
    const [card, setCardNameValue] = React.useState('');

    function handleSearchTextChange(e: any): void
    {
        setSearchValue(e.target.value);
    }

    function handleCardTextChange(e: any): void
    {
        setCardNameValue(e.target.value);
    }

    async function addCard(e: any): Promise<void>
    {
        e.preventDefault();
        let obj = {userId:userId, text:card}; // updated
        let js = JSON.stringify(obj);
        try
        {
            const response = await fetch('http://174.138.45.229:5000/api/addcard',
            {method:'POST', body:js, headers:{'Content-Type':'application/json'}});
            let txt = await response.text();
            let res = JSON.parse(txt);
            if(res.error.length > 0)
            {
                setMessage("API Error:" + res.error);
            }
            else
            {
                setMessage('Card has been added');
            }
        }
        catch(error:any)
        {
            setMessage(error.toString());
        }
    };

    async function searchCard(e: any): Promise<void>
    {
        e.preventDefault();
        let obj = {userId:userId, search:search};
        let js = JSON.stringify(obj);
        try
        {
            const response = await fetch('http://174.138.45.229:5000/api/searchcards',
            {method:'POST', body:js, headers:{'Content-Type':'application/json'}});
            let txt = await response.text();
            let res = JSON.parse(txt);
            setResults('Card(s) have been retrieved');
            setCardList(res.results); // store full note objects
        }
        catch(error:any)
        {
            alert(error.toString());
            setResults(error.toString());
        }
    };

    return(
        <div id="cardUIDiv">
            <br />
            Search: <input type="text" id="searchText" placeholder="Card To Search For"
                onChange={handleSearchTextChange} />
            <button type="button" id="searchCardButton" className="buttons"
                onClick={searchCard}> Search Card</button><br />
            <span id="cardSearchResult">{searchResults}</span>
            <p id="cardList">
                {cardList.map((note: any) => (
                    <div key={note.id}>
                        <span>{note.text}</span>
                        <small> — {new Date(note.createdAt).toLocaleDateString()}</small>
                    </div>
                ))}
            </p>
            <br /><br />
            Add: <input type="text" id="cardText" placeholder="Card To Add"
                onChange={handleCardTextChange} />
            <button type="button" id="addCardButton" className="buttons"
                onClick={addCard}> Add Card </button><br />
            <span id="cardAddResult">{message}</span>
        </div>
    );
}
export default CardUI;
