// Layout stays independent of Firebase so navigation works during loading.
const menuToggle = document.querySelector('.admin-menu-toggle');
const backdrop = document.querySelector('.admin-sidebar-backdrop');
const mobileLayout = window.matchMedia('(max-width: 900px)');
const navLinks = [...document.querySelectorAll('.admin-nav-link')];

function syncMenu() {
    const expanded = mobileLayout.matches
        ? document.body.classList.contains('admin-sidebar-open')
        : !document.body.classList.contains('admin-sidebar-collapsed');
    menuToggle.setAttribute('aria-expanded', String(expanded));
    menuToggle.setAttribute('aria-label', expanded ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
    backdrop.hidden = !(mobileLayout.matches && expanded);
    document.getElementById('admin-sidebar').inert = !expanded;
}
function closeMobileMenu() {
    document.body.classList.remove('admin-sidebar-open');
    syncMenu();
}
menuToggle.addEventListener('click', () => {
    document.body.classList.toggle(mobileLayout.matches ? 'admin-sidebar-open' : 'admin-sidebar-collapsed');
    syncMenu();
});
backdrop.addEventListener('click', closeMobileMenu);
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('admin-sidebar-open')) {
        closeMobileMenu();
        menuToggle.focus();
    }
});
mobileLayout.addEventListener('change', () => {
    document.body.classList.remove('admin-sidebar-open', 'admin-sidebar-collapsed');
    syncMenu();
});
function setActiveSection(id) {
    navLinks.forEach((link) => {
        const active = link.hash === `#${id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
}
navLinks.forEach((link) => link.addEventListener('click', () => {
    setActiveSection(link.hash.slice(1));
    if (mobileLayout.matches) closeMobileMenu();
}));
const sections = [...document.querySelectorAll('.admin-section')];
const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActiveSection(visible[0].target.id);
}, { rootMargin: '-64px 0px -55% 0px', threshold: 0 });
sections.forEach((section) => sectionObserver.observe(section));
setActiveSection(sections.some((section) => `#${section.id}` === location.hash) ? location.hash.slice(1) : 'overview');
syncMenu();
