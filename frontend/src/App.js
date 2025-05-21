import { useEffect, useState } from 'react';

const apiUrl = 'https://bba0semondf73sraglkt.containers.yandexcloud.net/api';

function App() {
  const [notes, setNotes] = useState([])

  const [openUpdateModal, setOpenUpdateModal] = useState(undefined)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [modalValue, setModalValue] = useState("")

  const updateNotes = () => {
    fetch(`${apiUrl}/notes`)
      .then(res => res.json())
      .then(data => setNotes(data))
    }

  useEffect(updateNotes, [])

  const updateNote = (id, value) => {
    fetch(`${apiUrl}/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify({value}),
      headers: {
        "Content-Type": "application/json"
      }
    }).then(updateNotes)

    setOpenUpdateModal(undefined)
  }

  const deleteNote = (id) => {
    fetch(`${apiUrl}/notes/${id}`, {
      method: "DELETE"
    }).then(updateNotes)
  }

  const createNote = (value) => {
    fetch(`${apiUrl}/notes`, {
      method: "POST",
      body: JSON.stringify({value}),
      headers: {
        "Content-Type": "application/json"
      }
    }).then(updateNotes)
    
    setOpenCreateModal(false)
  }

  const openCreate = () => {
    setModalValue("")
    setOpenCreateModal(true)
  }

  const openUpdate = (id) => {
    const note = notes.find(note => note.id === id)

    if(note){
      setModalValue(note.value)
      setOpenUpdateModal(id)
    }
  }

  return (
    <div style={{padding: "20px"}}>
      <header style={{marginBlockEnd: "20px"}}>
        Всего заметок: {notes.length}
      </header>
      <main>
        <div style={{marginBlockEnd: "10px"}}>
          <button onClick={openCreate}>Создать заметку</button>
        </div>
        <ul style={{listStyle: "none", display: "flex", flexWrap: "wrap", gap: "10px", padding: "0"}}>
          {notes.map(note => (
            <li key={note.id} style={{border: "1px solid black", padding: "5px"}}>
              <div style={{display: "flex", gap: "5px"}}>
              <button onClick={() => deleteNote(note.id)}>Удалить</button>
              <button onClick={() => openUpdate(note.id)}>Изменить</button>
              </div>
              <p style={{maxWidth: "200px"}}>{note.value}</p>
            </li>
          ))}
        </ul>
      </main>

      {openCreateModal && <div style={{
        position: "absolute", 
        inset: "20px", 
        backgroundColor: "white", 
        border: "1px solid black",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "20px"
      }}>
        <button onClick={() => setOpenCreateModal(false)} style={{marginBlockEnd: "10px"}}>Закрыть</button>
        <label style={{display: "flex", flexDirection: "column", gap: "5px"}}>
          Введите текст
          <textarea 
            value={modalValue} 
            onChange={event => setModalValue(event.target.value)} 
            style={{resize: "none"}}
            rows={10}
          />
        </label>
        <button onClick={() => createNote(modalValue)}>Создать</button>
      </div>}

      {openUpdateModal && <div style={{
        position: "absolute", 
        inset: "20px", 
        backgroundColor: "white", 
        border: "1px solid black",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "20px"
      }}>
        <button onClick={() => setOpenUpdateModal(undefined)} style={{marginBlockEnd: "10px"}}>Закрыть</button>
        <label style={{display: "flex", flexDirection: "column", gap: "5px"}}>
          Введите текст
          <textarea 
            value={modalValue} 
            onChange={event => setModalValue(event.target.value)} 
            style={{resize: "none"}}
            rows={10}
          />
        </label>
        <button onClick={() => updateNote(openUpdateModal, modalValue)}>Сохранить</button>
      </div>}
    </div>
  );
}

export default App;
