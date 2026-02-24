(function(){
  function toggleMenu(){ document.getElementById("mobile-nav")?.classList.toggle("open"); }
  function closeMenu(){ document.getElementById("mobile-nav")?.classList.remove("open"); }

  window.toggleMenu = toggleMenu;
  window.closeMenu = closeMenu;

  function buildMobileNav(){
    const mobile = document.getElementById("mobile-nav");
    const desktopNav = document.querySelector(".header .nav");
    if(!mobile || !desktopNav) return;

    // Only build once
    if(mobile.dataset.built === "1") return;
    mobile.dataset.built = "1";

    const links = Array.from(desktopNav.querySelectorAll("a"));
    mobile.innerHTML = "";
    links.forEach(a=>{
      const clone = a.cloneNode(true);
      clone.removeAttribute("target");
      clone.removeAttribute("rel");
      clone.addEventListener("click", closeMenu);
      mobile.appendChild(clone);
    });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    buildMobileNav();

    // Keyboard support for hamburger
    const ham = document.querySelector(".hamburger");
    if(ham){
      ham.addEventListener("keydown", (e)=>{
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          toggleMenu();
        }
      });
    }

    // Close if clicking outside
    document.addEventListener("click", (e)=>{
      const mobile = document.getElementById("mobile-nav");
      const ham = document.querySelector(".hamburger");
      if(!mobile || !ham) return;
      if(!mobile.classList.contains("open")) return;

      const inside = mobile.contains(e.target) || ham.contains(e.target);
      if(!inside) closeMenu();
    });

    // Close on resize up to desktop
    window.addEventListener("resize", ()=>{
      if(window.innerWidth > 600) closeMenu();
    });
  });
})();