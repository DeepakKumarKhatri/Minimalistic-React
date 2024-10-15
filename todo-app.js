function TodoApp() {
  const [todos, setTodos] = React.useState([]);
  const [newTodo, setNewTodo] = React.useState("");

  React.useEffect(() => {
    document.title = `You have ${todos.length} todos`;
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }]);
      setNewTodo("");
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return React.createElement(
    'div',
    { className: 'container' },
    React.createElement('h1', { className: 'title' }, 'Todo List'),
    React.createElement(
      'div',
      { className: 'input-container' },
      React.createElement('input', {
        type: 'text',
        value: newTodo,
        oninput: (e) => setNewTodo(e.target.value),
        placeholder: 'Enter a new todo',
        className: 'todo-input'
      }),
      React.createElement('button', { onclick: addTodo, className: 'add-button' }, 'Add Todo')
    ),
    React.createElement(
      'ul',
      { className: 'todo-list' },
      ...todos.map(todo =>
        React.createElement(
          'li',
          { key: todo.id, className: `todo-item ${todo.completed ? 'completed' : ''}` },
          React.createElement('span', { onclick: () => toggleTodo(todo.id) }, todo.text),
          React.createElement('button', { onclick: () => deleteTodo(todo.id), className: 'delete-button' }, 'Delete')
        )
      )
    )
  );
}

// Initial render
ReactDOM.render(React.createElement(TodoApp), document.getElementById('app'));