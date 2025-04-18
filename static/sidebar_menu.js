// JavaScript для управления боковым меню
document.addEventListener('DOMContentLoaded', function() {
    // Обработка клика по кнопке меню
    document.getElementById('menuBtn').addEventListener('click', function() {
      document.getElementById('sideMenu').classList.toggle('active');
      document.getElementById('overlay').classList.toggle('active');
    });

    // Закрытие меню при клике на подложку
    document.getElementById('overlay').addEventListener('click', function() {
      document.getElementById('sideMenu').classList.remove('active');
      this.classList.remove('active');
    });
});
