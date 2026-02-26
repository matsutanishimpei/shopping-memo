document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('add-form');
    const itemNameInput = document.getElementById('item-name');
    const itemCategoryInput = document.getElementById('item-category');
    const itemQuantityInput = document.getElementById('item-quantity');
    const unpurchasedList = document.getElementById('unpurchased-list');
    const purchasedList = document.getElementById('purchased-list');
    const unpurchasedCount = document.getElementById('unpurchased-count');
    const purchasedCount = document.getElementById('purchased-count');
    const purchasedSection = document.getElementById('purchased-section');
    const resetBtn = document.getElementById('reset-btn');
    const categoryOptions = document.getElementById('category-options');
    const categoryListContainer = document.getElementById('category-list');
    const clearDataBtn = document.getElementById('clear-data-btn');

    let items = JSON.parse(localStorage.getItem('shoppingAppItems')) || [];
    let savedCategories = JSON.parse(localStorage.getItem('shoppingAppCategories'));
    if (!savedCategories || !Array.isArray(savedCategories)) {
        savedCategories = [];
    }

    function saveCategories() {
        localStorage.setItem('shoppingAppCategories', JSON.stringify(savedCategories));
        updateCategoryDropdown();
        renderCategoryList();
    }

    function saveItems() {
        localStorage.setItem('shoppingAppItems', JSON.stringify(items));
        render();
    }

    function render() {
        unpurchasedList.innerHTML = '';
        purchasedList.innerHTML = '';

        const unpurchasedItems = items.filter(item => !item.purchased);
        const purchasedItems = items.filter(item => item.purchased);

        unpurchasedCount.textContent = unpurchasedItems.length;
        purchasedCount.textContent = purchasedItems.length;

        renderGroupedItems(unpurchasedList, unpurchasedItems);
        renderGroupedItems(purchasedList, purchasedItems);

        if (purchasedItems.length === 0) {
            purchasedSection.classList.add('empty');
        } else {
            purchasedSection.classList.remove('empty');
        }
    }

    function updateCategoryDropdown() {
        categoryOptions.innerHTML = '';
        savedCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            categoryOptions.appendChild(option);
        });
    }

    function renderCategoryList() {
        if (!categoryListContainer) return;
        categoryListContainer.innerHTML = '';
        savedCategories.forEach(cat => {
            const badge = document.createElement('div');
            badge.className = 'cat-badge';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = cat;

            const delBtn = document.createElement('button');
            delBtn.className = 'cat-delete-btn';
            delBtn.title = 'ドロップダウンから削除';
            delBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            delBtn.onclick = () => {
                savedCategories = savedCategories.filter(c => c !== cat);
                saveCategories();
            };

            badge.appendChild(nameSpan);
            badge.appendChild(delBtn);
            categoryListContainer.appendChild(badge);
        });
    }

    function renderGroupedItems(listElement, itemsArray) {
        if (itemsArray.length === 0) return;

        const grouped = {};
        itemsArray.forEach(item => {
            const cat = item.category || '未分類';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        const categories = Object.keys(grouped).sort();

        categories.forEach(cat => {
            const header = document.createElement('li');
            header.className = 'category-header';
            header.innerHTML = escapeHTML(cat);
            listElement.appendChild(header);

            grouped[cat].forEach(item => {
                listElement.appendChild(createItemElement(item));
            });
        });
    }

    function createItemElement(item) {
        const liContainer = document.createElement('li');
        liContainer.className = 'item-container';

        const swipeBg = document.createElement('div');
        swipeBg.className = 'swipe-action-bg ' + (item.purchased ? 'unpurchasing' : 'purchasing');
        swipeBg.innerHTML = item.purchased ? '未購入に戻す' : '購入済みにする';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';

        itemDiv.innerHTML = `
            <div class="item-info">
                <span class="item-name">${escapeHTML(item.name)}</span>
                <span class="item-quantity">
                    数量: 
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span class="qty-display">${escapeHTML(item.quantity.toString())}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </span>
            </div>
            <div class="item-actions">
                <button class="check-btn" onclick="toggleStatus('${item.id}')" title="${item.purchased ? '未購入に戻す' : '購入済みにする'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="delete-btn" onclick="deleteItem('${item.id}')" title="削除">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;

        // Swipe handling logic
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        itemDiv.addEventListener('touchstart', (e) => {
            if (e.target.closest('button')) return;
            startX = e.touches[0].clientX;
            isSwiping = true;
            itemDiv.classList.add('swiping');
        }, { passive: true });

        itemDiv.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            currentX = e.touches[0].clientX - startX;

            // Allow swiping right to purchase, left to unpurchase
            if ((!item.purchased && currentX > 0) || (item.purchased && currentX < 0)) {
                // dampen the swipe
                const moveX = currentX * 0.5;
                itemDiv.style.transform = `translateX(${moveX}px)`;

                // fade in background
                swipeBg.style.opacity = Math.min(Math.abs(currentX) / 100, 1);
            }
        }, { passive: true });

        itemDiv.addEventListener('touchend', () => {
            if (!isSwiping) return;
            isSwiping = false;
            itemDiv.classList.remove('swiping');

            if (!item.purchased && currentX > 80) { // Swipe right to purchase
                toggleStatus(item.id);
            } else if (item.purchased && currentX < -80) { // Swipe left to unpurchase
                toggleStatus(item.id);
            } else {
                // Reset position
                itemDiv.style.transform = '';
                swipeBg.style.opacity = '0';
            }
            currentX = 0;
        });

        liContainer.appendChild(swipeBg);
        liContainer.appendChild(itemDiv);
        return liContainer;
    }

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = itemNameInput.value.trim();
        const category = itemCategoryInput.value.trim() || '未分類';
        const quantity = itemQuantityInput.value.trim();

        if (name && quantity) {
            if (category && category !== '未分類' && !savedCategories.includes(category)) {
                savedCategories.push(category);
                saveCategories();
            }

            const newItem = {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
                name,
                category,
                quantity,
                purchased: false,
                createdAt: new Date().toISOString()
            };

            items.push(newItem);
            saveItems();

            itemNameInput.value = '';
            itemQuantityInput.value = '1';
            itemNameInput.focus();
        }
    });

    resetBtn.addEventListener('click', () => {
        const hasPurchased = items.some(item => item.purchased);
        if (!hasPurchased) return; // 何も購入済みがない場合は何もしない（アラートは出さない）

        // 即座に未購入状態に戻す
        items = items.map(item => ({ ...item, purchased: false }));
        saveItems();

        // 軽いアニメーションやフィードバックを追加（リセットボタンを点滅）
        resetBtn.style.opacity = '0.5';
        setTimeout(() => resetBtn.style.opacity = '1', 200);
    });

    window.updateQuantity = (id, delta) => {
        items = items.map(item => {
            if (item.id === id) {
                const newQuantity = Math.max(1, parseInt(item.quantity) + delta);
                return { ...item, quantity: newQuantity.toString() };
            }
            return item;
        });
        saveItems();
    };

    window.toggleStatus = (id) => {
        items = items.map(item => {
            if (item.id === id) {
                return { ...item, purchased: !item.purchased };
            }
            return item;
        });
        saveItems();
    };

    window.deleteItem = (id) => {
        items = items.filter(item => item.id !== id);
        saveItems();
    };

    let clearClicksRemaining = 3;
    let clearClickTimeout = null;

    clearDataBtn.addEventListener('click', () => {
        clearClicksRemaining--;

        if (clearClicksRemaining > 0) {
            clearDataBtn.textContent = `本当に削除しますか？ (あと ${clearClicksRemaining} 回クリック)`;

            // Reset after 3 seconds if not clicked again
            clearTimeout(clearClickTimeout);
            clearClickTimeout = setTimeout(() => {
                clearClicksRemaining = 3;
                clearDataBtn.textContent = 'ストレージのデータをすべて消去';
            }, 3000);
            return;
        }

        // 3 clicks reached
        clearTimeout(clearClickTimeout);

        // サイトに関連する全てのストレージデータを完全に消去します
        localStorage.clear();

        // 即座にページをリロードして完全に初期状態に戻します
        window.location.reload();
    });

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }

    render();
    updateCategoryDropdown();
    renderCategoryList();
});
