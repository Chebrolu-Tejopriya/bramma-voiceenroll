const notesDialog = document.getElementById('developerNotes');
let resumeAfterNotes = false;
document.getElementById('openNotes').addEventListener('click', () => {
  resumeAfterNotes = !paused;
  if (resumeAfterNotes) document.getElementById('pause').onclick();
  notesDialog.showModal();
});
for (const id of ['closeNotes', 'doneNotes']) {
  document.getElementById(id).addEventListener('click', () => notesDialog.close());
}
notesDialog.addEventListener('close', () => {
  if (resumeAfterNotes && paused) document.getElementById('pause').onclick();
  resumeAfterNotes = false;
});
notesDialog.addEventListener('click', event => {
  const bounds = notesDialog.getBoundingClientRect();
  if (event.target === notesDialog &&
      (event.clientX < bounds.left || event.clientX > bounds.right ||
       event.clientY < bounds.top || event.clientY > bounds.bottom)) notesDialog.close();
});
