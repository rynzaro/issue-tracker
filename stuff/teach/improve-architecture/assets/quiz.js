// Shared quiz widget. Usage in a lesson:
//   <div class="quiz" data-quiz></div>
//   <script src="../assets/quiz.js"></script>
//   <script> renderQuiz(document.querySelector('[data-quiz]'), QUESTIONS); </script>
// QUESTIONS: [{ stem, options: [..], answer: <index>, explain }]
// Options are shuffled on render so position never gives the answer away.
function renderQuiz(root, questions, title) {
  root.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = title || "Check yourself — answer from memory";
  root.appendChild(h);
  let answered = 0, correct = 0;
  const score = document.createElement("p");
  score.className = "score";

  questions.forEach((q, qi) => {
    const wrap = document.createElement("div");
    wrap.className = "q";
    const stem = document.createElement("p");
    stem.className = "stem";
    stem.textContent = (qi + 1) + ". " + q.stem;
    wrap.appendChild(stem);

    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    order.forEach((oi) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = q.options[oi];
      b.onclick = () => {
        if (wrap.classList.contains("answered")) return;
        wrap.classList.add("answered");
        answered++;
        if (oi === q.answer) { b.classList.add("correct"); correct++; }
        else {
          b.classList.add("wrong");
          [...wrap.querySelectorAll(".opt")].forEach((btn) => {
            if (btn.textContent === q.options[q.answer]) btn.classList.add("correct");
          });
        }
        if (answered === questions.length) {
          score.textContent = "Score: " + correct + " / " + questions.length +
            (correct === questions.length ? " — solid." : " — reread the missed part, then retry tomorrow.");
          score.style.display = "block";
        }
      };
      wrap.appendChild(b);
    });

    const ex = document.createElement("p");
    ex.className = "explain";
    ex.textContent = q.explain;
    wrap.appendChild(ex);
    root.appendChild(wrap);
  });
  root.appendChild(score);
}
