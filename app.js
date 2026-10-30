/**
 * Krav'n — Main Application Logic, OTP Auth, Store ID Filter,
 * Live 360° Video Canvas & Express QR Pickup Engine (app.js)
 */
(function () {
      // ===================================================================
      // FIREBASE PHONE AUTHENTICATION INITIALIZATION (KRAV'N)
      // ===================================================================
      const firebaseConfig = {
        apiKey: "AIzaSyAbVJJacU0gjevpPYl5wWgxLmcZ4neMbQk",
        authDomain: "krav-n-40dd1.firebaseapp.com",
        projectId: "krav-n-40dd1",
        storageBucket: "krav-n-40dd1.firebasestorage.app",
        messagingSenderId: "705350203757",
        appId: "1:705350203757:web:9256c6efb07de37386c264",
        measurementId: "G-3SRR3GNT8V"
      };

      let firebaseApp = null;
      let recaptchaVerifier = null;
      let confirmationResult = null;

      try {
        if (typeof firebase !== "undefined" && !firebase.apps.length) {
          firebaseApp = firebase.initializeApp(firebaseConfig);
        }
      } catch (err) {
        console.warn("Firebase initialization skipped or offline:", err);
      }
  const {
    PRESET_IMAGES,
    initialStores,
    initialItems,
    defaultMerchantSwatches
  } = window.KravnData;

      // Application State
      const state = {
        userPhone: "+91 98765 43210",
        intendedRole: "customer", // 'customer' | 'merchant'
        currentOtp: "",
        locationGranted: false,
        currentArea: "Civil Lines & Sadar Bazaar, Jhansi",
        activeTab: "discover", // 'discover' | 'orders' | 'settings'
        searchQuery: "",
        selectedStoreId: "ALL",
        selectedCategory: "all",
        sortBy: "nearest",
        stores: initialStores.slice(),
        items: initialItems.slice(),
        merchantSwatches: JSON.parse(JSON.stringify(defaultMerchantSwatches)),
        uploadedPhotoDataUrl: null,
        uploadedVideoObjectUrl: null,
        activeModalItemId: null,
        checkoutMode: "reserve", // 'reserve' | 'buy'
        orders: [
          {
            orderId: "PKP-8492",
            type: "RESERVED (15% Token Paid)",
            itemTitle: "Artisanal Belgian Flax Linen Overshirt",
            colorName: "Terracotta Clay",
            storeId: "KRV-1042",
            storeName: "Atelier Veda Linen & Apparel",
            storeAddress: "Shop 14, Civil Lines Main Promenade, Jhansi",
            fullPrice: 2490,
            paidAmount: 374,
            balanceDue: 2116,
            pickupSlot: "Today Evening (5:00 PM – 8:30 PM)",
            timestamp: "Reserved 14 mins ago • Counter Locker #B4"
          }
        ]
      };

      // Video Canvas Animation State
      let canvasAnimId = null;
      let isCanvasVideoPlaying = true;
      let canvasFrameTick = 0;

      // Utility: Show non-blocking aesthetic toast notification
      function showToast(title, subtitle, tone) {
        const container = document.getElementById("toastContainer");
        if (!container) return;
        const toast = document.createElement("div");
        const bgClass = tone === "error" ? "bg-red-900 text-white" : "bg-espresso text-alabaster";
        toast.className = "pointer-events-auto rounded-2xl p-4 shadow-2xl border border-white/15 flex items-start justify-between gap-3 smooth-fade " + bgClass;
        toast.innerHTML =
          '<div class="flex items-start gap-3">' +
            '<div class="w-8 h-8 rounded-xl bg-terracotta text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</div>' +
            '<div>' +
              '<div class="text-xs font-bold tracking-wide text-white">' + escapeHtml(title) + '</div>' +
              '<div class="text-xs text-stone-300 mt-0.5">' + escapeHtml(subtitle) + '</div>' +
            '</div>' +
          '</div>';
        container.appendChild(toast);
        setTimeout(function () {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.25s ease";
          setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 260);
        }, 3800);
      }

      function escapeHtml(str) {
        return String(str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function formatINR(num) {
        return "₹" + Number(num || 0).toLocaleString("en-IN");
      }

      // ===================================================================
      // AUTHENTICATION FLOW (MOBILE LOGIN + OTP)
      // ===================================================================
      function setInitialRoleChoice(role) {
        state.intendedRole = role;
        const btnCust = document.getElementById("roleBtnCustomer");
        const btnMerch = document.getElementById("roleBtnMerchant");
        if (role === "customer") {
          btnCust.className = "py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-white text-espresso shadow-sm";
          btnMerch.className = "py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 text-stone-600 hover:text-espresso";
        } else {
          btnMerch.className = "py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-white text-espresso shadow-sm";
          btnCust.className = "py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 text-stone-600 hover:text-espresso";
        }
      }

      function fillOtpBoxes(code) {
        const digits = String(code).split("");
        ["otpDigit1", "otpDigit2", "otpDigit3", "otpDigit4", "otpDigit5", "otpDigit6"].forEach(function (id, idx) {
          const el = document.getElementById(id);
          if (el) el.value = digits[idx] || "";
        });
      }

      function completeLoginAndEnterApp() {
        
        document.getElementById("authScreen").classList.add("hidden");
        document.getElementById("mainAppShell").classList.remove("hidden");
        document.getElementById("settingsUserPhone").textContent = state.userPhone;

        renderAll();

        if (state.intendedRole === "merchant") {
          switchMainTab("settings");
          showToast(
            "Welcome to Krav'n Merchant Studio",
            "Register your store to get a unique Store ID or upload new inventory items below.",
            "success"
          );
        } else {
          switchMainTab("discover");
          showToast(
            "Signed in to Krav'n (" + state.userPhone + ")",
            "Allow location access or search any Store ID (e.g. KRV-1042) to shop nearby.",
            "success"
          );
        }
      }

      // ===================================================================
      // LOCATION PERMISSION & NEARBY DISCOVERY
      // ===================================================================
      function grantLocationPermission() {
        const districtSelect = document.getElementById("cityDistrictSelect");
        if (districtSelect && districtSelect.value) {
          state.currentArea = districtSelect.value;
        }
        state.locationGranted = true;

        const banner = document.getElementById("locationPermissionBanner");
        if (banner) banner.classList.add("hidden");

        const headerLabel = document.getElementById("headerLocationLabel");
        if (headerLabel) headerLabel.textContent = state.currentArea + " • GPS Active";

        const pulseDot = document.getElementById("locationPulseDot");
        const solidDot = document.getElementById("locationSolidDot");
        if (pulseDot) pulseDot.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
        if (solidDot) solidDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600";

        showToast(
          "Location Locked: " + state.currentArea,
          "Showing " + state.stores.length + " verified offline stores sorted by walking distance.",
          "success"
        );
        renderAll();
      }

      // ===================================================================
      // NAVIGATION TABS
      // ===================================================================
      function switchMainTab(tabName) {
        state.activeTab = tabName;
        const views = {
          discover: document.getElementById("viewDiscover"),
          orders: document.getElementById("viewOrders"),
          settings: document.getElementById("viewSettings"),
          files: document.getElementById("viewFiles")
        };
        const buttons = {
          discover: document.getElementById("tabBtnDiscover"),
          orders: document.getElementById("tabBtnOrders"),
          settings: document.getElementById("tabBtnSettings"),
          files: document.getElementById("tabBtnFiles")
        };

        Object.keys(views).forEach(function (key) {
          if (!views[key] || !buttons[key]) return;
          if (key === tabName) {
            views[key].classList.remove("hidden");
            buttons[key].className = "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 bg-espresso text-white shadow-sm";
          } else {
            views[key].classList.add("hidden");
            buttons[key].className = "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 text-stone-700 hover:bg-sand relative";
          }
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // ===================================================================
      // RENDERING: STORE ID PILLS, REGISTERED STORES, ITEMS & ORDERS
      // ===================================================================
      function renderStoreIdQuickPills() {
        const container = document.getElementById("storeIdQuickPills");
        if (!container) return;

        let html =
          '<button type="button" data-storepill="ALL" class="px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ' +
          (state.selectedStoreId === "ALL"
            ? "bg-terracotta text-white shadow-sm"
            : "bg-white/10 text-stone-200 hover:bg-white/20") +
          '">All Nearby Stores (' + state.stores.length + ')</button>';

        state.stores.forEach(function (st) {
          const active = state.selectedStoreId === st.id;
          html +=
            '<button type="button" data-storepill="' + escapeHtml(st.id) + '" class="px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ' +
            (active
              ? "bg-amber-400 text-espresso shadow-sm"
              : "bg-white/10 text-stone-200 hover:bg-white/20") +
            '">' +
              '<span class="font-mono font-bold">' + escapeHtml(st.id) + '</span>' +
              '<span>• ' + escapeHtml(st.name.split(" ")[0] + " " + (st.name.split(" ")[1] || "")) + '</span>' +
            '</button>';
        });

        container.innerHTML = html;

        container.querySelectorAll("[data-storepill]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const targetId = btn.getAttribute("data-storepill");
            state.selectedStoreId = targetId;
            renderAll();
          });
        });
      }

      function renderStoresSection() {
        const container = document.getElementById("storesContainer");
        const countPill = document.getElementById("storeCountPill");
        const resetBtn = document.getElementById("btnShowAllStores");
        const highlightBanner = document.getElementById("activeStoreHighlightBanner");

        if (countPill) countPill.textContent = state.stores.length + " Verified";
        if (resetBtn) {
          if (state.selectedStoreId !== "ALL" || state.searchQuery.trim() !== "") {
            resetBtn.classList.remove("hidden");
          } else {
            resetBtn.classList.add("hidden");
          }
        }

        // Filter stores if search query matches store ID or name
        const q = state.searchQuery.trim().toLowerCase();
        const visibleStores = state.stores.filter(function (st) {
          if (!q) return true;
          const hasMatchingItem = state.items.some(function (itm) {
            return itm.storeId === st.id && (
              itm.title.toLowerCase().includes(q) ||
              itm.category.toLowerCase().includes(q)
            );
          });
          return (
            st.id.toLowerCase().includes(q) ||
            st.name.toLowerCase().includes(q) ||
            st.type.toLowerCase().includes(q) ||
            st.specialty.toLowerCase().includes(q) ||
            hasMatchingItem
          );
        });

        let html = "";
        visibleStores.forEach(function (st) {
          const isSelected = state.selectedStoreId === st.id;
          const itemCount = state.items.filter(function (i) { return i.storeId === st.id; }).length;
          html +=
            '<div class="card-elevated rounded-2xl p-5 flex flex-col justify-between transition cursor-pointer ' +
            (isSelected ? "ring-2 ring-terracotta bg-amber-50/30" : "") +
            '" data-storecard="' + escapeHtml(st.id) + '">' +
              '<div>' +
                '<div class="flex items-center justify-between gap-2">' +
                  '<span class="px-2.5 py-1 rounded-lg bg-espresso text-amber-300 font-mono text-xs font-bold tracking-wider">' +
                    escapeHtml(st.id) +
                  '</span>' +
                  '<div class="flex items-center gap-1.5">' +
                    '<span class="text-xs font-semibold text-sage bg-sageLight px-2 py-0.5 rounded-md">📍 ' + escapeHtml(st.distance) + '</span>' +
                    '<button type="button" data-copystore="' + escapeHtml(st.id) + '" class="px-2 py-0.5 rounded-md bg-sand hover:bg-linen text-[11px] font-semibold text-espresso" title="Copy Store ID">Copy ID</button>' +
                  '</div>' +
                '</div>' +
                '<h3 class="font-editorial text-2xl font-bold text-espresso mt-3 leading-snug">' +
                  escapeHtml(st.name) +
                '</h3>' +
                '<div class="text-xs font-semibold text-terracotta mt-0.5">' + escapeHtml(st.type) + ' • ' + escapeHtml(st.rating) + '</div>' +
                '<p class="text-xs text-stone-600 mt-2 line-clamp-2">' + escapeHtml(st.specialty) + '</p>' +
              '</div>' +
              '<div class="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">' +
                '<span class="text-stone-500 font-medium">⚡ Pickup: <strong class="text-espresso">' + escapeHtml(st.pickupMins) + '</strong> (' + itemCount + ' items)</span>' +
                '<span class="font-bold ' + (isSelected ? "text-terracotta" : "text-espresso") + '">' +
                  (isSelected ? "Viewing Store ✓" : "Open Store →") +
                '</span>' +
              '</div>' +
            '</div>';
        });

        container.innerHTML = html || (
          '<div class="col-span-full p-8 rounded-2xl bg-white border border-stone-200 text-center">' +
            '<div class="text-base font-bold text-espresso">No store matched "' + escapeHtml(state.searchQuery) + '"</div>' +
            '<p class="text-xs text-stone-500 mt-1">Try searching Store IDs like KRV-1042, KRV-2089, KRV-3115, or KRV-4050.</p>' +
          '</div>'
        );

        // Bind store card clicks & Copy ID clicks
        container.querySelectorAll("[data-copystore]").forEach(function (copyBtn) {
          copyBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            const sid = copyBtn.getAttribute("data-copystore");
            copyTextSafe(sid);
            showToast("Copied Store ID: " + sid, "Share this Store ID so customers can jump directly to this shop.", "success");
          });
        });

        container.querySelectorAll("[data-storecard]").forEach(function (card) {
          card.addEventListener("click", function () {
            const sid = card.getAttribute("data-storecard");
            state.selectedStoreId = state.selectedStoreId === sid ? "ALL" : sid;
            renderAll();
          });
        });

        // Active Store Highlight Banner
        if (state.selectedStoreId !== "ALL") {
          const activeStore = state.stores.find(function (s) { return s.id === state.selectedStoreId; });
          if (activeStore && highlightBanner) {
            highlightBanner.classList.remove("hidden");
            highlightBanner.innerHTML =
              '<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">' +
                '<div>' +
                  '<div class="flex flex-wrap items-center gap-2">' +
                    '<span class="px-3 py-1 rounded-lg bg-espresso text-amber-300 font-mono text-xs font-bold">STORE ID: ' + escapeHtml(activeStore.id) + '</span>' +
                    '<span class="px-2.5 py-1 rounded-lg bg-sage text-white text-xs font-semibold">✓ Verified Offline Storefront</span>' +
                    '<span class="text-xs font-semibold text-stone-600">📍 ' + escapeHtml(activeStore.address) + ' (' + escapeHtml(activeStore.distance) + ')</span>' +
                  '</div>' +
                  '<h3 class="font-editorial text-3xl font-bold text-espresso mt-2">' + escapeHtml(activeStore.name) + '</h3>' +
                  '<p class="text-xs sm:text-sm text-stone-600 mt-0.5">' + escapeHtml(activeStore.specialty) + ' • <strong class="text-terracotta">' + escapeHtml(activeStore.queueSaved) + '</strong></p>' +
                '</div>' +
                '<div class="flex items-center gap-2 shrink-0">' +
                  '<button type="button" id="btnAddMoreToThisStore" class="px-4 py-2.5 rounded-xl bg-white border border-stone-300 hover:border-espresso text-espresso text-xs font-semibold transition">' +
                    '+ Upload Item to ' + escapeHtml(activeStore.id) +
                  '</button>' +
                  '<button type="button" id="btnExitSingleStore" class="px-4 py-2.5 rounded-xl bg-espresso text-white text-xs font-semibold hover:bg-terracotta transition">' +
                    'Show All Stores ✕' +
                  '</button>' +
                '</div>' +
              '</div>';

            const btnExit = document.getElementById("btnExitSingleStore");
            if (btnExit) {
              btnExit.addEventListener("click", function () {
                state.selectedStoreId = "ALL";
                renderAll();
              });
            }
            const btnUploadHere = document.getElementById("btnAddMoreToThisStore");
            if (btnUploadHere) {
              btnUploadHere.addEventListener("click", function () {
                const selectEl = document.getElementById("itemStoreSelect");
                if (selectEl) selectEl.value = activeStore.id;
                switchMainTab("settings");
              });
            }
          }
        } else if (highlightBanner) {
          highlightBanner.classList.add("hidden");
        }
      }

      function renderItemsGrid() {
        const container = document.getElementById("itemsGridContainer");
        const titleEl = document.getElementById("catalogSectionTitle");
        if (!container) return;

        const q = state.searchQuery.trim().toLowerCase();

        let filtered = state.items.filter(function (item) {
          const store = state.stores.find(function (s) { return s.id === item.storeId; });
          if (state.selectedStoreId !== "ALL" && item.storeId !== state.selectedStoreId) {
            return false;
          }
          if (state.selectedCategory !== "all" && item.category !== state.selectedCategory) {
            return false;
          }
          if (q) {
            const matchStoreId = item.storeId.toLowerCase().includes(q);
            const matchStoreName = store && store.name.toLowerCase().includes(q);
            const matchTitle = item.title.toLowerCase().includes(q);
            const matchCat = item.category.toLowerCase().includes(q);
            const matchQuality = item.qualityGrade.toLowerCase().includes(q);
            const matchColor = item.colors.some(function (c) { return c.name.toLowerCase().includes(q); });
            return matchStoreId || matchStoreName || matchTitle || matchCat || matchQuality || matchColor;
          }
          return true;
        });

        // Sort filtered items
        filtered.sort(function (a, b) {
          if (state.sortBy === "priceAsc") return a.price - b.price;
          if (state.sortBy === "priceDesc") return b.price - a.price;
          if (state.sortBy === "reserveLow") {
            return Math.round(a.price * a.reservePct / 100) - Math.round(b.price * b.reservePct / 100);
          }
          // Default: nearest store first
          const stA = state.stores.find(function (s) { return s.id === a.storeId; });
          const stB = state.stores.find(function (s) { return s.id === b.storeId; });
          return (stA ? stA.distanceNum : 9) - (stB ? stB.distanceNum : 9);
        });

        if (titleEl) {
          if (state.selectedStoreId !== "ALL") {
            const st = state.stores.find(function (s) { return s.id === state.selectedStoreId; });
            titleEl.textContent = "Store Inventory for " + (st ? st.name + " (" + st.id + ")" : state.selectedStoreId);
          } else {
            titleEl.textContent = "Live In-Store Items Available Right Now (" + filtered.length + ")";
          }
        }

        let html = "";
        filtered.forEach(function (item) {
          const store = state.stores.find(function (s) { return s.id === item.storeId; }) || state.stores[0];
          const activeColor = item.colors[item.selectedColorIndex] || item.colors[0];
          const reserveTokenAmt = Math.round((item.price * item.reservePct) / 100);

          let swatchesHtml = "";
          item.colors.forEach(function (clr, idx) {
            const isSel = idx === item.selectedColorIndex;
            swatchesHtml +=
              '<button type="button" data-itemcolor="' + escapeHtml(item.id) + ':' + idx + '" ' +
              'class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ' +
              (isSel
                ? "border-espresso bg-espresso text-white shadow-sm"
                : "border-stone-300 bg-alabaster text-stone-700 hover:border-stone-400") +
              '">' +
                '<span class="w-3 h-3 rounded-full border border-white/40 shrink-0" style="background-color:' + escapeHtml(clr.hex) + '"></span>' +
                '<span>' + escapeHtml(clr.name) + '</span>' +
                '<span class="opacity-75">(' + clr.stock + ')</span>' +
              '</button>';
          });

          html +=
            '<article class="card-elevated rounded-3xl overflow-hidden flex flex-col justify-between">' +
              '<div>' +
                '<!-- Top Image & Video Preview Header -->' +
                '<div class="relative h-60 bg-stone-900 overflow-hidden group cursor-pointer" data-openmodal="' + escapeHtml(item.id) + ':photo">' +
                  '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />' +
                  '<div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35"></div>' +

                  '<!-- Top Badges: Store ID & Pickup Time -->' +
                  '<div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">' +
                    '<button type="button" data-filterstore="' + escapeHtml(item.storeId) + '" class="px-2.5 py-1 rounded-lg bg-espresso/90 backdrop-blur-md text-amber-300 font-mono text-xs font-bold border border-white/15 hover:bg-terracotta hover:text-white transition">' +
                      escapeHtml(item.storeId) + ' • ' + escapeHtml(store.name.split(" ")[0] + " " + (store.name.split(" ")[1] || "")) +
                    '</button>' +
                    '<span class="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold">' +
                      '📍 ' + escapeHtml(store.distance) +
                    '</span>' +
                  '</div>' +

                  '<!-- Bottom Overlay: Video Walkthrough Pill & Quality Pill -->' +
                  '<div class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">' +
                    '<button type="button" data-openmodal="' + escapeHtml(item.id) + ':video" class="px-3 py-1.5 rounded-xl bg-terracotta/95 hover:bg-terracotta text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition">' +
                      '<span>▶ Watch Store Video Reel</span>' +
                    '</button>' +
                    '<span class="px-2.5 py-1 rounded-lg bg-white/90 text-espresso text-[11px] font-bold">' +
                      'Ready in ' + escapeHtml(store.pickupMins) +
                    '</span>' +
                  '</div>' +
                '</div>' +

                '<!-- Card Body -->' +
                '<div class="p-5 space-y-3.5">' +
                  '<div class="flex items-start justify-between gap-2">' +
                    '<h3 class="font-editorial text-2xl font-bold text-espresso leading-snug cursor-pointer hover:text-terracotta transition" data-openmodal="' + escapeHtml(item.id) + ':photo">' +
                      escapeHtml(item.title) +
                    '</h3>' +
                  '</div>' +

                  '<!-- Price & Small Reservation Token Strip -->' +
                  '<div class="flex items-center justify-between p-3 rounded-2xl bg-sand/75 border border-stone-200/80">' +
                    '<div>' +
                      '<div class="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Store Price</div>' +
                      '<div class="text-xl font-bold text-espresso">' + formatINR(item.price) + '</div>' +
                    '</div>' +
                    '<div class="text-right">' +
                      '<div class="text-[10px] font-bold uppercase tracking-wider text-terracotta">Reserve Token (' + item.reservePct + '%)</div>' +
                      '<div class="text-lg font-bold text-terracotta">' + formatINR(reserveTokenAmt) + ' <span class="text-xs font-normal text-stone-600">to hold</span></div>' +
                    '</div>' +
                  '</div>' +

                  '<!-- Quality Grade Info -->' +
                  '<div class="text-xs text-stone-600 bg-alabaster p-2.5 rounded-xl border border-stone-200/70">' +
                    '<div class="font-bold text-espresso flex items-center gap-1">' +
                      '<span class="text-sage">✓ Quality:</span> ' + escapeHtml(item.qualityGrade) +
                    '</div>' +
                    '<p class="text-[11px] text-stone-500 mt-0.5 line-clamp-1">' + escapeHtml(item.qualitySpecs) + '</p>' +
                  '</div>' +

                  '<!-- Colour Availability Swatches -->' +
                  '<div class="space-y-1.5">' +
                    '<div class="flex items-center justify-between text-[11px]">' +
                      '<span class="font-bold uppercase tracking-wider text-stone-500">Colour Availability:</span>' +
                      '<span class="font-semibold text-sage">' + escapeHtml(activeColor.name) + ' • ' + activeColor.stock + ' in stock</span>' +
                    '</div>' +
                    '<div class="flex flex-wrap gap-1.5">' +
                      swatchesHtml +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<!-- Card Footer Actions: Reserve vs Direct Buy -->' +
              '<div class="px-5 pb-5 pt-2 grid grid-cols-2 gap-2.5">' +
                '<button type="button" data-quickcheckout="' + escapeHtml(item.id) + ':reserve" class="py-3 px-3 rounded-xl border-2 border-terracotta text-terracotta hover:bg-terracotta hover:text-white font-bold text-xs transition text-center">' +
                  'Reserve (' + formatINR(reserveTokenAmt) + ')' +
                '</button>' +
                '<button type="button" data-quickcheckout="' + escapeHtml(item.id) + ':buy" class="py-3 px-3 rounded-xl bg-espresso hover:bg-terracotta text-white font-bold text-xs transition text-center shadow-sm">' +
                  'Buy Now (' + formatINR(item.price) + ')' +
                '</button>' +
              '</div>' +
            '</article>';
        });

        container.innerHTML = html || (
          '<div class="col-span-full p-10 rounded-3xl bg-white border border-stone-200 text-center space-y-3">' +
            '<div class="text-xl font-editorial font-bold text-espresso">No items match your current filter</div>' +
            '<p class="text-xs text-stone-500">Reset the Store ID or category filter to view all nearby store inventory.</p>' +
            '<button id="btnResetEmptyCatalog" type="button" class="px-4 py-2 rounded-xl bg-espresso text-white text-xs font-semibold">Reset All Filters</button>' +
          '</div>'
        );

        const btnResetEmpty = document.getElementById("btnResetEmptyCatalog");
        if (btnResetEmpty) {
          btnResetEmpty.addEventListener("click", function () {
            state.selectedStoreId = "ALL";
            state.selectedCategory = "all";
            state.searchQuery = "";
            document.getElementById("globalSearchInput").value = "";
            renderAll();
          });
        }

        // Bind colour swatch selection
        container.querySelectorAll("[data-itemcolor]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const parts = btn.getAttribute("data-itemcolor").split(":");
            const itm = state.items.find(function (i) { return i.id === parts[0]; });
            if (itm) {
              itm.selectedColorIndex = parseInt(parts[1], 10) || 0;
              renderItemsGrid();
            }
          });
        });

        // Bind store filter badge click
        container.querySelectorAll("[data-filterstore]").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            state.selectedStoreId = btn.getAttribute("data-filterstore");
            renderAll();
          });
        });

        // Bind modal open (photo or video tab)
        container.querySelectorAll("[data-openmodal]").forEach(function (el) {
          el.addEventListener("click", function (e) {
            e.stopPropagation();
            const parts = el.getAttribute("data-openmodal").split(":");
            openItemDetailModal(parts[0], parts[1] || "photo");
          });
        });

        // Bind quick Reserve / Buy Now buttons
        container.querySelectorAll("[data-quickcheckout]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const parts = btn.getAttribute("data-quickcheckout").split(":");
            openCheckoutModal(parts[0], parts[1]);
          });
        });
      }

      // ===================================================================
      // ITEM PHOTO + LIVE VIDEO REEL MODAL
      // ===================================================================
      function openItemDetailModal(itemId, initialMediaTab) {
        const item = state.items.find(function (i) { return i.id === itemId; });
        if (!item) return;
        state.activeModalItemId = itemId;

        const store = state.stores.find(function (s) { return s.id === item.storeId; }) || state.stores[0];
        const activeColor = item.colors[item.selectedColorIndex] || item.colors[0];
        const reserveAmt = Math.round((item.price * item.reservePct) / 100);
        const balanceAmt = item.price - reserveAmt;

        document.getElementById("modalStoreIdBadge").textContent = item.storeId;
        document.getElementById("modalStoreNameText").textContent = store.name;
        document.getElementById("modalStoreDistText").textContent = "• " + store.distance;
        document.getElementById("modalItemCategory").textContent = item.category;
        document.getElementById("modalPickupReadyBadge").textContent = "⚡ Ready in " + store.pickupMins;
        document.getElementById("modalItemTitle").textContent = item.title;
        document.getElementById("modalItemPrice").textContent = formatINR(item.price);
        document.getElementById("modalItemReservePrice").textContent = formatINR(reserveAmt);
        document.getElementById("modalItemReserveNote").textContent = item.reservePct + "% token • Pay " + formatINR(balanceAmt) + " at shop";
        document.getElementById("modalQualityGrade").textContent = item.qualityGrade;
        document.getElementById("modalQualitySpecs").textContent = item.qualitySpecs;
        document.getElementById("modalItemImage").src = item.image;
        document.getElementById("modalActiveColorOverlayPill").textContent = "Shade: " + activeColor.name;
        document.getElementById("modalColorStockLabel").textContent = activeColor.stock + " pieces available in " + activeColor.name;
        document.getElementById("modalVideoCaption").textContent = item.videoStyle || "Live Merchant 360° Quality Reel";

        const tintEl = document.getElementById("modalPhotoColorTint");
        if (tintEl) {
          tintEl.style.backgroundColor = activeColor.hex;
          tintEl.style.opacity = item.selectedColorIndex === 0 ? "0" : "0.18";
        }

        // Render colour swatches inside modal
        const swatchBox = document.getElementById("modalColorSwatches");
        let swHtml = "";
        item.colors.forEach(function (clr, idx) {
          const isSel = idx === item.selectedColorIndex;
          swHtml +=
            '<button type="button" data-modalcolor="' + idx + '" class="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ' +
            (isSel ? "border-espresso bg-espresso text-white shadow-sm" : "border-stone-300 bg-alabaster text-espresso") +
            '">' +
              '<span class="w-3.5 h-3.5 rounded-full border border-white/50" style="background-color:' + escapeHtml(clr.hex) + '"></span>' +
              '<span>' + escapeHtml(clr.name) + ' (' + clr.stock + ' left)</span>' +
            '</button>';
        });
        swatchBox.innerHTML = swHtml;
        swatchBox.querySelectorAll("[data-modalcolor]").forEach(function (b) {
          b.addEventListener("click", function () {
            item.selectedColorIndex = parseInt(b.getAttribute("data-modalcolor"), 10) || 0;
            openItemDetailModal(item.id, !document.getElementById("modalVideoWrapper").classList.contains("hidden") ? "video" : "photo");
            renderItemsGrid();
          });
        });

        document.getElementById("btnModalReserveLabel").textContent = "Reserve Item (Pay " + formatINR(reserveAmt) + ")";
        document.getElementById("btnModalBuyLabel").textContent = "Buy Directly (Pay " + formatINR(item.price) + ")";

        document.getElementById("itemDetailModal").classList.remove("hidden");
        switchModalMediaTab(initialMediaTab === "video" ? "video" : "photo");
      }

      function switchModalMediaTab(mode) {
        const photoWrap = document.getElementById("modalPhotoWrapper");
        const videoWrap = document.getElementById("modalVideoWrapper");
        const btnPhoto = document.getElementById("btnModalMediaPhoto");
        const btnVideo = document.getElementById("btnModalMediaVideo");
        const item = state.items.find(function (i) { return i.id === state.activeModalItemId; });

        if (mode === "video") {
          photoWrap.classList.add("hidden");
          videoWrap.classList.remove("hidden");
          btnVideo.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-terracotta text-white transition flex items-center gap-1";
          btnPhoto.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:text-amber-200 transition";
          startModalVideoShowcase(item);
        } else {
          videoWrap.classList.add("hidden");
          photoWrap.classList.remove("hidden");
          btnPhoto.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-espresso transition";
          btnVideo.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:text-amber-200 transition flex items-center gap-1";
          stopModalVideoShowcase();
        }
      }

      function startModalVideoShowcase(item) {
        stopModalVideoShowcase();
        if (!item) return;

        const videoEl = document.getElementById("modalUploadedVideoEl");
        const canvasEl = document.getElementById("modalLiveVideoCanvas");

        if (item.uploadedVideoUrl) {
          canvasEl.classList.add("hidden");
          videoEl.classList.remove("hidden");
          videoEl.src = item.uploadedVideoUrl;
          videoEl.play().catch(function () {});
          return;
        }

        videoEl.classList.add("hidden");
        canvasEl.classList.remove("hidden");

        const ctx = canvasEl.getContext("2d");
        const img = new Image();
        img.src = item.image;
        isCanvasVideoPlaying = true;
        document.getElementById("btnToggleCanvasVideo").textContent = "⏸ Pause Reel";

        function renderFrame() {
          if (isCanvasVideoPlaying) {
            canvasFrameTick += 1;
          }
          const w = canvasEl.width;
          const h = canvasEl.height;
          ctx.clearRect(0, 0, w, h);

          // Smooth pan & zoom Ken Burns effect simulating a merchant handheld walkthrough video
          const progress = (Math.sin(canvasFrameTick * 0.025) + 1) / 2;
          const scale = 1.06 + progress * 0.16;
          const offsetX = Math.cos(canvasFrameTick * 0.018) * 18;
          const offsetY = Math.sin(canvasFrameTick * 0.02) * 12;

          if (img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.translate(w / 2 + offsetX, h / 2 + offsetY);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.restore();
          } else {
            ctx.fillStyle = "#1C1917";
            ctx.fillRect(0, 0, w, h);
          }

          // Active colour swatch subtle studio light overlay
          const activeColor = item.colors[item.selectedColorIndex] || item.colors[0];
          ctx.fillStyle = activeColor.hex + "22";
          ctx.fillRect(0, 0, w, h);

          // Dark cinematic vignette
          const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(15,12,10,0.88)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Live Merchant Callout HUD Overlay
          ctx.fillStyle = "rgba(28, 25, 23, 0.78)";
          ctx.beginPath();
          ctx.roundRect(18, 64, 245, 52, 12);
          ctx.fill();

          ctx.fillStyle = "#FBBF24";
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.fillText("● LIVE STORE REEL • " + item.storeId, 30, 84);

          ctx.fillStyle = "#FFFFFF";
          ctx.font = "12px Inter, sans-serif";
          ctx.fillText("Shade: " + activeColor.name + " (" + activeColor.stock + " in stock)", 30, 103);

          // Bottom Spec Verification Overlay + Progress Bar
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 14px Inter, sans-serif";
          ctx.fillText(item.videoStyle || "360° Store Quality Walkthrough", 20, h - 42);

          ctx.fillStyle = "#D6D3D1";
          ctx.font = "11px Inter, sans-serif";
          ctx.fillText(item.qualityGrade, 20, h - 24);

          // Progress bar
          const barWidth = w - 40;
          const pct = (canvasFrameTick % 240) / 240;
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillRect(20, h - 12, barWidth, 4);
          ctx.fillStyle = "#C85A32";
          ctx.fillRect(20, h - 12, barWidth * pct, 4);

          canvasAnimId = requestAnimationFrame(renderFrame);
        }

        canvasAnimId = requestAnimationFrame(renderFrame);
      }

      function stopModalVideoShowcase() {
        if (canvasAnimId) {
          cancelAnimationFrame(canvasAnimId);
          canvasAnimId = null;
        }
        const videoEl = document.getElementById("modalUploadedVideoEl");
        if (videoEl) {
          videoEl.pause();
        }
      }

      // ===================================================================
      // CHECKOUT MODAL (RESERVE WITH SMALL AMOUNT vs. DIRECT PURCHASE)
      // ===================================================================
      function openCheckoutModal(itemId, mode) {
        const item = state.items.find(function (i) { return i.id === itemId; });
        if (!item) return;
        state.activeModalItemId = itemId;
        state.checkoutMode = mode === "buy" ? "buy" : "reserve";

        document.getElementById("itemDetailModal").classList.add("hidden");
        stopModalVideoShowcase();

        updateCheckoutModalUI();
        document.getElementById("checkoutModal").classList.remove("hidden");
      }

      function updateCheckoutModalUI() {
        const item = state.items.find(function (i) { return i.id === state.activeModalItemId; });
        if (!item) return;
        const store = state.stores.find(function (s) { return s.id === item.storeId; }) || state.stores[0];
        const activeColor = item.colors[item.selectedColorIndex] || item.colors[0];
        const reserveAmt = Math.round((item.price * item.reservePct) / 100);
        const isReserve = state.checkoutMode === "reserve";

        const badge = document.getElementById("checkoutModeBadge");
        const btnRes = document.getElementById("chkSwitchReserve");
        const btnBuy = document.getElementById("chkSwitchBuy");

        if (isReserve) {
          badge.textContent = "Reserve Item • Pay " + item.reservePct + "% Small Token Now";
          badge.className = "px-2.5 py-0.5 rounded-full bg-terracotta/15 text-terracotta text-xs font-bold uppercase tracking-wider";
          btnRes.className = "py-2.5 px-3 rounded-xl text-xs font-bold transition bg-white text-terracotta shadow-sm";
          btnBuy.className = "py-2.5 px-3 rounded-xl text-xs font-bold transition text-stone-600 hover:text-espresso";
        } else {
          badge.textContent = "Direct Purchase • 100% Paid Express Pickup";
          badge.className = "px-2.5 py-0.5 rounded-full bg-sageLight text-sage text-xs font-bold uppercase tracking-wider";
          btnBuy.className = "py-2.5 px-3 rounded-xl text-xs font-bold transition bg-white text-espresso shadow-sm";
          btnRes.className = "py-2.5 px-3 rounded-xl text-xs font-bold transition text-stone-600 hover:text-espresso";
        }

        document.getElementById("chkItemTitle").textContent = item.title;
        document.getElementById("chkStoreInfo").textContent = "Store ID: " + item.storeId + " • " + store.name + " (" + store.distance + ")";
        document.getElementById("chkSelectedColorPill").textContent = activeColor.name;
        document.getElementById("chkFullPrice").textContent = formatINR(item.price);
        document.getElementById("chkBalanceDue").textContent = isReserve ? formatINR(item.price - reserveAmt) : "₹0 (Fully Paid)";
        document.getElementById("chkPayNowLabel").textContent = isReserve
          ? "Token Payable Now (" + item.reservePct + "% Reservation):"
          : "Total Payable to Merchant Now (100%):";
        const payableNow = isReserve ? reserveAmt : item.price;
        document.getElementById("chkPayNowAmount").textContent = formatINR(payableNow);
        document.getElementById("btnConfirmPayText").textContent =
          (isReserve ? "Pay Reservation Token " : "Pay Merchant ") + formatINR(payableNow) + " & Get Pickup Pass";
      }

      // ===================================================================
      // RENDER ORDERS & EXPRESS STORE PICKUP PASSES (WITH QR CODE)
      // ===================================================================
      function renderOrdersSection() {
        const badge = document.getElementById("ordersCountBadge");
        if (badge) badge.textContent = String(state.orders.length);

        const container = document.getElementById("ordersListContainer");
        if (!container) return;

        let html = "";
        state.orders.forEach(function (ord) {
          const isReserved = ord.balanceDue > 0;
          html +=
            '<div class="card-elevated rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-8 ' +
            (isReserved ? "border-l-terracotta" : "border-l-sage") +
            '">' +
              '<div class="space-y-2.5 flex-1">' +
                '<div class="flex flex-wrap items-center gap-2">' +
                  '<span class="px-3 py-1 rounded-lg bg-espresso text-amber-300 font-mono text-xs font-bold">' + escapeHtml(ord.orderId) + '</span>' +
                  '<span class="px-3 py-1 rounded-lg text-xs font-bold ' +
                    (isReserved ? "bg-terracotta/15 text-terracotta" : "bg-sageLight text-sage") +
                  '">' + escapeHtml(ord.type) + '</span>' +
                  '<span class="text-xs font-semibold text-stone-500">Store ID: <strong class="text-espresso">' + escapeHtml(ord.storeId) + '</strong></span>' +
                '</div>' +
                '<h3 class="font-editorial text-2xl sm:text-3xl font-bold text-espresso">' + escapeHtml(ord.itemTitle) + '</h3>' +
                '<div class="text-xs sm:text-sm text-stone-700">' +
                  '<strong>Colour:</strong> ' + escapeHtml(ord.colorName) + ' &nbsp;•&nbsp; <strong>Store:</strong> ' + escapeHtml(ord.storeName) +
                '</div>' +
                '<div class="text-xs text-stone-500">' +
                  '📍 ' + escapeHtml(ord.storeAddress) + ' &nbsp;•&nbsp; 🕒 ' + escapeHtml(ord.pickupSlot) +
                '</div>' +
                '<div class="pt-2 flex flex-wrap items-center gap-4 text-xs">' +
                  '<span class="px-3 py-1.5 rounded-xl bg-sand font-semibold text-espresso">Paid to Merchant: ' + formatINR(ord.paidAmount) + '</span>' +
                  '<span class="px-3 py-1.5 rounded-xl bg-alabaster border border-stone-200 font-semibold text-stone-700">' +
                    (isReserved ? "Pay at Shop Counter on Pickup: " + formatINR(ord.balanceDue) : "Balance Due at Counter: ₹0 (Express Handover)") +
                  '</span>' +
                '</div>' +
              '</div>' +

              '<!-- Scannable Store Pickup Pass QR Card -->' +
              '<div class="p-4 rounded-2xl bg-espresso text-white text-center shrink-0 w-full md:w-48 flex flex-col items-center justify-center">' +
                '<div class="bg-white p-2.5 rounded-xl inline-block">' +
                  '<svg class="w-24 h-24 text-espresso" viewBox="0 0 100 100" fill="currentColor">' +
                    '<rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="6"/>' +
                    '<rect x="14" y="14" width="12" height="12" rx="2"/>' +
                    '<rect x="65" y="5" width="30" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="6"/>' +
                    '<rect x="74" y="14" width="12" height="12" rx="2"/>' +
                    '<rect x="5" y="65" width="30" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="6"/>' +
                    '<rect x="14" y="74" width="12" height="12" rx="2"/>' +
                    '<rect x="44" y="12" width="10" height="10"/>' +
                    '<rect x="44" y="30" width="12" height="12"/>' +
                    '<rect x="44" y="50" width="18" height="10"/>' +
                    '<rect x="12" y="44" width="22" height="10"/>' +
                    '<rect x="68" y="46" width="12" height="22"/>' +
                    '<rect x="46" y="70" width="20" height="12"/>' +
                    '<rect x="74" y="76" width="18" height="16"/>' +
                  '</svg>' +
                '</div>' +
                '<div class="text-[11px] font-mono font-bold text-amber-300 mt-2">' + escapeHtml(ord.orderId) + '</div>' +
                '<div class="text-[10px] text-stone-300 mt-0.5">Scan at ' + escapeHtml(ord.storeId) + ' Counter</div>' +
              '</div>' +
            '</div>';
        });

        container.innerHTML = html;
      }

      // ===================================================================
      // SETTINGS & MERCHANT PORTAL (REGISTER STORE & UPLOAD ITEM)
      // ===================================================================
      function generateRandomStoreId() {
        const rand = Math.floor(5100 + Math.random() * 4800);
        return "KRV-" + rand;
      }

      function renderMerchantSettingsSelectors() {
        const storeSelect = document.getElementById("itemStoreSelect");
        if (storeSelect) {
          const currentVal = storeSelect.value;
          let opts = "";
          state.stores.forEach(function (st) {
            opts += '<option value="' + escapeHtml(st.id) + '">' + escapeHtml(st.id) + " — " + escapeHtml(st.name) + "</option>";
          });
          storeSelect.innerHTML = opts;
          if (currentVal && state.stores.some(function (s) { return s.id === currentVal; })) {
            storeSelect.value = currentVal;
          }
        }

        const swatchPicker = document.getElementById("merchantColorSwatchesPicker");
        if (swatchPicker) {
          let html = "";
          state.merchantSwatches.forEach(function (sw, idx) {
            html +=
              '<button type="button" data-merchswatch="' + idx + '" class="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ' +
              (sw.selected
                ? "border-espresso bg-espresso text-white shadow-sm"
                : "border-stone-300 bg-white text-stone-500 opacity-65") +
              '">' +
                '<span class="w-3.5 h-3.5 rounded-full border border-white/50" style="background-color:' + escapeHtml(sw.hex) + '"></span>' +
                '<span>' + escapeHtml(sw.name) + ' (' + sw.stock + ')</span>' +
                '<span>' + (sw.selected ? "✓" : "+") + '</span>' +
              '</button>';
          });
          swatchPicker.innerHTML = html;

          swatchPicker.querySelectorAll("[data-merchswatch]").forEach(function (btn) {
            btn.addEventListener("click", function () {
              const i = parseInt(btn.getAttribute("data-merchswatch"), 10);
              if (state.merchantSwatches[i]) {
                state.merchantSwatches[i].selected = !state.merchantSwatches[i].selected;
                renderMerchantSettingsSelectors();
              }
            });
          });
        }
      }

      function copyTextSafe(text) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () {});
            return;
          }
        } catch (e) {}
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (err) {}
        document.body.removeChild(ta);
      }

      const STORAGE_KEY = "kravn_live_state_v1";

      function saveStateToStorage() {
        try {
          const payload = {
            userPhone: state.userPhone,
            currentArea: state.currentArea,
            stores: state.stores,
            items: state.items,
            orders: state.orders,
            merchantSwatches: state.merchantSwatches
          };
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (err) {
          // Ignore storage quota or sandboxed iframe restrictions
        }
      }

      function loadStateFromStorage() {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            if (parsed.userPhone) state.userPhone = parsed.userPhone;
            if (parsed.currentArea) state.currentArea = parsed.currentArea;
            if (Array.isArray(parsed.stores) && parsed.stores.length > 0) {
              state.stores = parsed.stores;
            }
            if (Array.isArray(parsed.items) && parsed.items.length > 0) {
              state.items = parsed.items;
            }
            if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
              state.orders = parsed.orders;
            }
            if (Array.isArray(parsed.merchantSwatches) && parsed.merchantSwatches.length > 0) {
              state.merchantSwatches = parsed.merchantSwatches;
            }
          }
        } catch (err) {
          // Ignore storage read restrictions in sandboxed environments
        }
      }

      function resetDemoData() {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (err) {}
        state.stores = initialStores.slice();
        state.items = initialItems.slice();
        state.merchantSwatches = JSON.parse(JSON.stringify(defaultMerchantSwatches));
        state.selectedStoreId = "ALL";
        state.selectedCategory = "all";
        state.searchQuery = "";
        renderAll();
        showToast(
          "Demo Data Restored",
          "All default stores, items, and reservations have been reset.",
          "success"
        );
      }


      // ===================================================================
      // PROJECT FILES REPOSITORY & 1-CLICK ACCESS ENGINE
      // ===================================================================
      const PROJECT_FILES = [
      {
            "id": "kravn_app",
            "name": "kravn_app.html",
            "category": "app",
            "badge": "Single-File App \u2022 100% Offline",
            "icon": "\ud83c\udf10",
            "size": "716 KB",
            "desc": "The complete, self-contained single-file Krav'n web application with inlined CSS, JS, and studio base64 photography. Runs immediately in any browser.",
            "mime": "text/html",
            "driveUrl": "https://drive.google.com/file/d/1JE4eIncaP-3AQky3P8SoeAcOuqVBA35L/view?usp=drivesdk",
            "isText": true
      },
      {
            "id": "index_html",
            "name": "index.html",
            "category": "app",
            "badge": "Modular HTML \u2022 Entry Point",
            "icon": "\ud83d\udcc4",
            "size": "295 KB",
            "desc": "Modular HTML5 application structure linking external styles.css, tailwind.config.js, data.js, and app.js for traditional multi-file web hosting.",
            "mime": "text/html",
            "driveUrl": "https://drive.google.com/file/d/1xJIADDvJMZttVKXEIeGsd8xI0SmZ98NH/view?usp=drivesdk",
            "isText": true
      },
      {
            "id": "app_js",
            "name": "app.js",
            "category": "source",
            "badge": "JavaScript \u2022 Core Controller",
            "icon": "\u26a1",
            "size": "73 KB",
            "desc": "Application state management, OTP auth flow, Store ID lookup, 360\u00b0 video simulation engine, express QR pass generator, and localStorage persistence.",
            "mime": "application/javascript",
            "driveUrl": "https://drive.google.com/file/d/1JGQI8AFNPXwHqze2_Rqxoud-l4P917Bu/view?usp=drivesdk",
            "isText": true
      },
      {
            "id": "data_js",
            "name": "data.js",
            "category": "source",
            "badge": "JavaScript \u2022 Catalog & Media",
            "icon": "\ud83d\uddc4\ufe0f",
            "size": "345 KB",
            "desc": "Store records (Jhansi network), item catalog, default merchant color swatches, and embedded high-resolution studio photography data URIs.",
            "mime": "application/javascript",
            "driveUrl": "https://drive.google.com/file/d/1BVPjo6krNfNxY5t5CXPdhEASOCwZ5NYu/view?usp=drivesdk",
            "isText": true
      },
      {
            "id": "styles_css",
            "name": "styles.css",
            "category": "source",
            "badge": "CSS3 \u2022 Editorial Theme",
            "icon": "\ud83c\udfa8",
            "size": "2,101 bytes",
            "desc": "Playfair Display typography styling, custom scrollbars, frosted glassmorphism overlays, and smooth layout fade transitions.",
            "mime": "text/css",
            "driveUrl": "https://drive.google.com/file/d/110o4euCxGUZDuRMoW9oVN_WUTtm1wsk_/view?usp=drivesdk",
            "isText": true,
            "content": "/* ==========================================================================\n   Krav'n \u2014 Hyperlocal Offline Store Discovery, Reserve & Express Pickup\n   Custom Stylesheet (styles.css)\n   ========================================================================== */\n* {\n      box-sizing: border-box;\n      -webkit-tap-highlight-color: transparent;\n    }\n    body {\n      background-color: #FAF7F2;\n      color: #1C1917;\n      font-family: 'Inter', sans-serif;\n      overflow-x: hidden;\n    }\n    .font-editorial {\n      font-family: 'Cormorant Garamond', Georgia, serif;\n    }\n    .glass-panel {\n      background: rgba(250, 247, 242, 0.88);\n      backdrop-filter: blur(16px);\n      -webkit-backdrop-filter: blur(16px);\n    }\n    .card-elevated {\n      background: #FFFFFF;\n      border: 1px solid rgba(28, 25, 23, 0.08);\n      box-shadow: 0 10px 30px -10px rgba(28, 25, 23, 0.06);\n      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1);\n    }\n    .card-elevated:hover {\n      transform: translateY(-2px);\n      box-shadow: 0 18px 38px -12px rgba(28, 25, 23, 0.12);\n    }\n    .smooth-fade {\n      animation: fadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n    }\n    @keyframes fadeIn {\n      from { opacity: 0; transform: translateY(8px); }\n      to { opacity: 1; transform: translateY(0); }\n    }\n    @keyframes pulseRing {\n      0% { transform: scale(0.9); opacity: 0.8; }\n      70% { transform: scale(1.35); opacity: 0; }\n      100% { transform: scale(1.35); opacity: 0; }\n    }\n    .radar-pulse::before {\n      content: '';\n      position: absolute;\n      inset: -4px;\n      border-radius: 9999px;\n      background-color: #3A5A40;\n      animation: pulseRing 2s infinite;\n      z-index: 0;\n    }\n    .custom-scrollbar::-webkit-scrollbar {\n      height: 6px;\n      width: 6px;\n    }\n    .custom-scrollbar::-webkit-scrollbar-track {\n      background: #F2ECE1;\n      border-radius: 9999px;\n    }\n    .custom-scrollbar::-webkit-scrollbar-thumb {\n      background: #D6CWB8;\n      background-color: #C7B9A5;\n      border-radius: 9999px;\n    }\n"
      },
      {
            "id": "tailwind_config",
            "name": "tailwind.config.js",
            "category": "source",
            "badge": "Tailwind CSS \u2022 Config",
            "icon": "\u2699\ufe0f",
            "size": "669 bytes",
            "desc": "Tailwind theme extensions specifying the bespoke color palette (alabaster, sand, espresso, terracotta, sage, amber) and font family stacks.",
            "mime": "application/javascript",
            "driveUrl": "https://drive.google.com/file/d/1KYICTzmpBLh1bnJuLCzuiXCOkmTCzxQa/view?usp=drivesdk",
            "isText": true,
            "content": "/**\n * Krav'n \u2014 Tailwind CSS Theme Configuration (tailwind.config.js)\n */\ntailwind.config = {\n      theme: {\n        extend: {\n          fontFamily: {\n            sans: ['Inter', ' system-ui', 'sans-serif'],\n            serif: ['Cormorant Garamond', 'Georgia', 'serif'],\n          },\n          colors: {\n            alabaster: '#FAF7F2',\n            sand: '#F2ECE1',\n            linen: '#E6DEC8',\n            espresso: '#1C1917',\n            charcoal: '#44403C',\n            terracotta: '#C85A32',\n            terracottaDark: '#A94622',\n            sage: '#3A5A40',\n            sageLight: '#E9F0EA',\n            amberGold: '#D97706'\n          }\n        }\n      }\n    };"
      },
      {
            "id": "package_json",
            "name": "package.json",
            "category": "deploy",
            "badge": "Node.js \u2022 NPM Config",
            "icon": "\ud83d\udce6",
            "size": "642 bytes",
            "desc": "Package metadata, project description, and npm start script configured for zero-dependency local static development servers.",
            "mime": "application/json",
            "driveUrl": "https://drive.google.com/file/d/1OgnXiQXZ-ZoaDr2oz_qPJcbgWfSrk57q/view?usp=drivesdk",
            "isText": true,
            "content": "{\n  \"name\": \"kravn-hyperlocal-store-pickup\",\n  \"version\": \"1.0.0\",\n  \"description\": \"Krav'n \u2014 Hyperlocal Offline Store Discovery, Live Video Quality Check, Reserve & Express Counter Pickup Web Application\",\n  \"main\": \"index.html\",\n  \"scripts\": {\n    \"start\": \"npx serve . -l 3000\",\n    \"dev\": \"npx live-server --port=3000 --open=index.html\"\n  },\n  \"keywords\": [\n    \"hyperlocal\",\n    \"o2o-commerce\",\n    \"reserve-in-store\",\n    \"express-pickup\",\n    \"store-id\",\n    \"tailwindcss\",\n    \"vanilla-js\"\n  ],\n  \"author\": \"Krav'n Commerce Studio\",\n  \"license\": \"MIT\",\n  \"devDependencies\": {\n    \"live-server\": \"^1.2.2\",\n    \"serve\": \"^14.2.1\"\n  }\n}\n"
      },
      {
            "id": "vercel_json",
            "name": "vercel.json",
            "category": "deploy",
            "badge": "Vercel \u2022 Routing Config",
            "icon": "\u25b2",
            "size": "204 bytes",
            "desc": "Vercel routing rules and clean URL rewrites for immediate static production deployment via Vercel CLI or GitHub.",
            "mime": "application/json",
            "driveUrl": "https://drive.google.com/file/d/1abMKVEn--aGay9TWqahGG6lCizAsIoJV/view?usp=drivesdk",
            "isText": true,
            "content": "{\n  \"version\": 2,\n  \"name\": \"kravn-hyperlocal-store-discovery\",\n  \"cleanUrls\": true,\n  \"trailingSlash\": false,\n  \"rewrites\": [\n    {\n      \"source\": \"/(.*)\",\n      \"destination\": \"/index.html\"\n    }\n  ]\n}"
      },
      {
            "id": "netlify_toml",
            "name": "netlify.toml",
            "category": "deploy",
            "badge": "Netlify \u2022 Routing Config",
            "icon": "\ud83d\udc8e",
            "size": "134 bytes",
            "desc": "Netlify production publish directory and 200 redirect rules for drag-and-drop hosting via Netlify Drop.",
            "mime": "text/plain",
            "driveUrl": "https://drive.google.com/file/d/1-3PZv2kD8KtTtv9pPwc7wxbaiz0W2xZQ/view?usp=drivesdk",
            "isText": true,
            "content": "[build]\n  publish = \".\"\n  command = \"echo 'Static deployment ready'\"\n\n[[redirects]]\n  from = \"/*\"\n  to = \"/index.html\"\n  status = 200\n"
      },
      {
            "id": "manifest_json",
            "name": "manifest.json",
            "category": "deploy",
            "badge": "PWA \u2022 Web Manifest",
            "icon": "\ud83d\udcf1",
            "size": "522 bytes",
            "desc": "Progressive Web App manifest defining standalone launch mode, theme color (#1E1916), background color, and app icons.",
            "mime": "application/json",
            "driveUrl": "https://drive.google.com/file/d/1riCjTh6IJnxNAJeQiH2P_tXnN-gFUb23/view?usp=drivesdk",
            "isText": true,
            "content": "{\n  \"name\": \"Krav'n \\u2014 Offline Store Discovery, Reserve & Express Pickup\",\n  \"short_name\": \"Krav'n\",\n  \"description\": \"Search local offline stores by Unique Store ID (KRV-XXXX), inspect 360\\u00b0 live video & fabric specs, reserve for 15% or buy directly for express counter pickup.\",\n  \"start_url\": \"/index.html\",\n  \"display\": \"standalone\",\n  \"background_color\": \"#FAF7F2\",\n  \"theme_color\": \"#1E1916\",\n  \"icons\": [\n    {\n      \"src\": \"assets/hero.jpg\",\n      \"sizes\": \"512x512\",\n      \"type\": \"image/jpeg\"\n    }\n  ]\n}"
      },
      {
            "id": "readme_md",
            "name": "README.md",
            "category": "docs",
            "badge": "Documentation \u2022 Guide",
            "icon": "\ud83d\udcd8",
            "size": "5,308 bytes",
            "desc": "Comprehensive architecture guide, project file tree, feature breakdown, and step-by-step free online publishing walkthrough.",
            "mime": "text/markdown",
            "driveUrl": "https://drive.google.com/file/d/1_9teN5V-l0laqSbT5txcGa95OgXBmNdu/view?usp=drivesdk",
            "isText": true,
            "content": "# Krav'n \u2014 Hyperlocal Offline Store Discovery, Reserve & Express Pickup\n\n**Krav'n** is a complete, production-ready web application for hyperlocal offline store discovery, live 360\u00b0 video & quality inspection, 15% token reservation, direct online purchase, and Express Counter Pickup via QR passes.\n\n## \ud83d\udcc1 Complete Project File Structure\n\n```\nkravn-project/\n\u251c\u2500\u2500 index.html              # Modular main application entry point (loads external CSS & JS)\n\u251c\u2500\u2500 styles.css              # Editorial theme variables, glassmorphism, animations & custom scrollbars\n\u251c\u2500\u2500 tailwind.config.js      # Custom Tailwind CSS palette (alabaster, sand, espresso, terracotta, sage, amber)\n\u251c\u2500\u2500 data.js                 # Initial stores, items, colour swatches, and embedded base64 studio photography\n\u251c\u2500\u2500 app.js                  # Interactive application controller + localStorage persistence + QR & 360\u00b0 Canvas engine\n\u251c\u2500\u2500 kravn_app.html          # Single-file all-in-one production bundle (100% self-contained)\n\u251c\u2500\u2500 package.json            # NPM scripts for local development and static hosting\n\u251c\u2500\u2500 vercel.json             # Zero-config Vercel production routing configuration\n\u251c\u2500\u2500 netlify.toml            # Zero-config Netlify production routing configuration\n\u251c\u2500\u2500 manifest.json           # Web App Manifest for mobile home-screen installation\n\u251c\u2500\u2500 README.md               # Full architecture & step-by-step publishing guide\n\u2514\u2500\u2500 assets/                 # Extracted studio product & hero photography\n    \u251c\u2500\u2500 hero.jpg            # Boutique storefront hero image\n    \u251c\u2500\u2500 linen.jpg           # Artisanal Belgian Flax Linen Overshirt image\n    \u251c\u2500\u2500 sneakers.jpg        # Hand-Stitched Suede Court Sneakers image\n    \u2514\u2500\u2500 ceramic.jpg         # Matte Terracotta Pour-Over Coffee Set image\n\n```\n\n## \u2728 Key Working Features\n\n1. **Mobile Number + 6-Digit Real SMS OTP Login (`authScreen`)**:\n\n   * Switch between **Customer** and **Shop Owner (Merchant)** roles or click **Skip Login & Explore Live Demo Immediately**.\n\n   * Auto-generates a 4-digit demo OTP banner and auto-fills digits on click.\n\n2. **Hyperlocal Store ID Discovery (`KRV-XXXX`)**:\n\n   * Search by **Unique Store ID** (e.g., `KRV-1042`, `KRV-2088`, `KRV-3105`, `KRV-4019`), shop name, or item keyword.\n\n   * One-click Store ID filter pills and category filters (`Apparel & Tailoring`, `Footwear & Leather`, `Ceramics & Home`).\n\n3. **Interactive Product Inspection & Live 360\u00b0 Video Reel (`itemModal`)**:\n\n   * Real-time HTML5 `<canvas>` 360\u00b0 studio video simulator with play/pause toggle, quality grade inspection (`Grade A+ Export`, `Handcrafted First-Run`), colour swatch stock selector, and dual checkout modes (**Reserve with 15% Token** vs. **Direct Full Purchase**).\n\n4. **Express Pickup QR Passes (`viewOrders`)**:\n\n   * Generates instant order passes (`PKP-XXXX`) with a deterministic SVG QR code matrix, locker assignment, and balance breakdown.\n\n5. **Merchant Portal & Store Registration (`viewSettings`)**:\n\n   * **Step 1 (Register Your Store)**: Generates a unique `KRV-XXXX` Store ID and adds your physical shop to the live directory.\n\n   * **Step 2 (Upload Store Item)**: Attach custom photos/videos (or choose studio presets), add custom hex colour swatches with unit stock, set reserve percentage, and publish immediately.\n\n6. **Automatic Browser State Persistence (`localStorage`)**:\n\n   * Newly registered stores, uploaded items, and generated Express Pickup QR passes automatically persist across browser refreshes. Click **Reset Demo Data** in Settings at any time to restore the default catalog.\n\n## \ud83d\ude80 Step-by-Step Guide to Publish Online (Free & Under 2 Minutes)\n\n### Option 1: Netlify Drop (Fastest \u2014 30 Seconds, No Coding or Terminal Needed)\n\n1. Download `kravn-project-complete.zip` and extract/unzip it on your computer.\n\n2. Open <https://app.netlify.com/drop> in your browser.\n\n3. Drag and drop the extracted folder directly onto the page.\n\n4. Netlify will immediately publish your site and give you a live HTTPS link (e.g., `https://your-kravn-site.netlify.app`) that you can share or connect to a custom domain.\n\n### Option 2: Publish with Vercel (Recommended for Custom Domains & Git)\n\n1. Unzip `kravn-project-complete.zip` into a folder named `kravn-app`.\n\n2. Using the Vercel CLI:\n\n   ```\n   npx vercel --prod\n   \n   ```\n\n3. Or upload the folder to a GitHub repository, visit <https://vercel.com/new>, import the repository, and click **Deploy** (`vercel.json` is already pre-configured).\n\n### Option 3: Publish on GitHub Pages (100% Free Forever)\n\n1. Create a new public repository on [GitHub](https://github.com/new).\n\n2. Click **Add file \u2192 Upload files** and drag all files from the extracted zip (`index.html`, `styles.css`, `tailwind.config.js`, `data.js`, `app.js`, `assets/`, etc.), then click **Commit changes**.\n\n3. Go to **Settings \u2192 Pages**, select **Deploy from a branch**, choose `main` (and `/ (root)`), and click **Save**.\n\n4. Your site will be live at `https://<your-username>.github.io/<repo-name>/` within 60 seconds.\n\n### Option 4: Run Locally on Your Computer\n\n* **Zero-Server Mode**: Double-click `kravn_app.html` or `index.html` to open directly in Chrome, Edge, Safari, or Firefox.\n\n* **Local Dev Server (Node.js)**:\n\n  ```\n  npx serve . -l 3000\n  \n  ```\n\n* **Local Dev Server (Python 3)**:\n\n  ```\n  python3 -m http.server 8080\n  \n  ```"
      },
      {
            "id": "asset_hero",
            "name": "assets/hero.jpg",
            "category": "assets",
            "badge": "Studio Asset \u2022 JPEG",
            "icon": "\ud83d\uddbc\ufe0f",
            "size": "102 KB",
            "desc": "High-resolution curated boutique storefront hero imagery showcasing curated local artisanal goods.",
            "mime": "image/jpeg",
            "driveUrl": "https://drive.google.com/file/d/12eglUnzNme_0oeoczJIqDFAM89csw23g/view?usp=drivesdk",
            "presetKey": "hero",
            "isText": false
      },
      {
            "id": "asset_linen",
            "name": "assets/linen.jpg",
            "category": "assets",
            "badge": "Studio Asset \u2022 JPEG",
            "icon": "\ud83d\udc55",
            "size": "69 KB",
            "desc": "Artisanal Belgian Flax Linen Overshirt studio product photography with fabric texture detail.",
            "mime": "image/jpeg",
            "driveUrl": "https://drive.google.com/file/d/1s1GwCwaRVkQpQRFr6Uj7Bzc9CS_853Wc/view?usp=drivesdk",
            "presetKey": "linen",
            "isText": false
      },
      {
            "id": "asset_sneakers",
            "name": "assets/sneakers.jpg",
            "category": "assets",
            "badge": "Studio Asset \u2022 JPEG",
            "icon": "\ud83d\udc5f",
            "size": "38 KB",
            "desc": "Hand-Stitched Suede Court Sneakers studio footwear photography for footwear & leather goods.",
            "mime": "image/jpeg",
            "driveUrl": "https://drive.google.com/file/d/1e6wjA73xNsS7EjtgxiwdovidC3v89v4z/view?usp=drivesdk",
            "presetKey": "sneakers",
            "isText": false
      },
      {
            "id": "asset_ceramic",
            "name": "assets/ceramic.jpg",
            "category": "assets",
            "badge": "Studio Asset \u2022 JPEG",
            "icon": "\ud83c\udffa",
            "size": "43 KB",
            "desc": "Matte Terracotta Pour-Over Coffee Set studio ceramic photography for artisanal homeware.",
            "mime": "image/jpeg",
            "driveUrl": "https://drive.google.com/file/d/1EPaTP73lCZt8w5Axgb3m16yWO0KQ90Bu/view?usp=drivesdk",
            "presetKey": "ceramic",
            "isText": false
      },
      {
            "id": "complete_zip",
            "name": "kravn-project-complete.zip",
            "category": "deploy",
            "badge": "All-in-One \u2022 ZIP Bundle",
            "icon": "\ud83d\uddc2\ufe0f",
            "size": "1.2 MB",
            "desc": "The complete project zip archive packaging all 15 source files, configs, documentation, and studio assets in one download.",
            "mime": "application/zip",
            "driveUrl": "https://drive.google.com/file/d/1e8zc4Dn4CGcHLS70xk9NEhNET4j9WQD7/view?usp=drivesdk",
            "isText": false
      }
];
      let activeFileFilter = "all";
      let activeCodeViewerFile = null;

      function getProjectFileContent(file) {
        if (file.content) return file.content;
        if (file.name === "kravn_app.html") {
          return document.documentElement.outerHTML;
        }
        if (file.name === "index.html") {
          return document.documentElement.outerHTML;
        }
        if (file.name === "app.js") {
          return "(app.js controller script - available in full bundle)";
        }
        if (file.name === "data.js") {
          return "window.KravnData = " + JSON.stringify(window.KravnData, null, 2) + ";";
        }
        return "";
      }

      function downloadBlobFile(filename, content, mimeType) {
        try {
          const blob = new Blob([content], { type: mimeType || "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          showToast("Downloaded " + filename, "Saved directly to your local downloads folder.", "success");
        } catch (err) {
          showToast("Download Triggered", "Opening file source directly.", "info");
        }
      }

      function downloadBase64Image(filename, dataUrl) {
        try {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = filename.split("/").pop();
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast("Downloaded " + filename, "Image saved directly to your downloads.", "success");
        } catch (err) {
          window.open(dataUrl, "_blank");
        }
      }

      function openCodeViewer(file) {
        activeCodeViewerFile = file;
        const modal = document.getElementById("codeViewerModal");
        if (!modal) return;
        document.getElementById("codeViewerTitle").textContent = file.name;
        document.getElementById("codeViewerBadge").textContent = file.badge;
        document.getElementById("codeViewerIcon").textContent = file.icon;
        document.getElementById("codeViewerDriveLink").href = file.driveUrl;

        let content = getProjectFileContent(file);
        const lineCount = (content.match(/\n/g) || []).length + 1;
        document.getElementById("codeViewerMeta").textContent = lineCount + " lines • " + file.size;
        document.getElementById("codeViewerContent").textContent = content;

        modal.classList.remove("hidden");
      }

      function renderProjectFilesGrid() {
        const grid = document.getElementById("projectFilesGrid");
        if (!grid) return;
        grid.innerHTML = "";

        const filtered = PROJECT_FILES.filter(function (file) {
          if (activeFileFilter === "all") return true;
          return file.category === activeFileFilter;
        });

        filtered.forEach(function (file) {
          const card = document.createElement("div");
          card.className = "card-elevated rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-terracotta/40 transition";

          let actionButtons = "";
          if (file.isText) {
            actionButtons =
              '<div class="grid grid-cols-2 gap-2 pt-2">' +
                '<button type="button" class="btn-view-code py-2.5 px-3 rounded-xl bg-sand hover:bg-stone-200 text-espresso text-xs font-bold transition flex items-center justify-center gap-1.5" data-file-id="' + file.id + '">' +
                  '<span>👁️ View Code</span>' +
                '</button>' +
                '<button type="button" class="btn-dl-file py-2.5 px-3 rounded-xl bg-espresso hover:bg-terracotta text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm" data-file-id="' + file.id + '">' +
                  '<span>⬇️ Download</span>' +
                '</button>' +
              '</div>';
          } else if (file.presetKey) {
            actionButtons =
              '<div class="grid grid-cols-2 gap-2 pt-2">' +
                '<button type="button" class="btn-view-img py-2.5 px-3 rounded-xl bg-sand hover:bg-stone-200 text-espresso text-xs font-bold transition flex items-center justify-center gap-1.5" data-file-id="' + file.id + '">' +
                  '<span>🖼️ Preview</span>' +
                '</button>' +
                '<button type="button" class="btn-dl-img py-2.5 px-3 rounded-xl bg-espresso hover:bg-terracotta text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm" data-file-id="' + file.id + '">' +
                  '<span>⬇️ Download</span>' +
                '</button>' +
              '</div>';
          } else {
            actionButtons =
              '<div class="pt-2">' +
                '<a href="' + file.driveUrl + '" target="_blank" rel="noopener noreferrer" class="w-full py-2.5 px-3 rounded-xl bg-espresso hover:bg-terracotta text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">' +
                  '<span>📥 Download from Drive</span>' +
                '</a>' +
              '</div>';
          }

          card.innerHTML =
            '<div>' +
              '<div class="flex items-start justify-between gap-3 mb-3">' +
                '<div class="w-12 h-12 rounded-2xl bg-espresso text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">' +
                  file.icon +
                '</div>' +
                '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">' +
                  escapeHtml(file.badge) +
                '</span>' +
              '</div>' +
              '<h4 class="text-base font-bold text-espresso font-mono tracking-tight">' +
                escapeHtml(file.name) +
              '</h4>' +
              '<p class="text-xs text-stone-600 mt-1.5 leading-relaxed">' +
                escapeHtml(file.desc) +
              '</p>' +
            '</div>' +
            '<div class="space-y-3 pt-3 border-t border-stone-100">' +
              '<div class="flex items-center justify-between text-xs text-stone-500">' +
                '<span>Size: <strong class="text-espresso">' + file.size + '</strong></span>' +
                '<a href="' + file.driveUrl + '" target="_blank" rel="noopener noreferrer" class="text-terracotta font-semibold hover:underline flex items-center gap-1">' +
                  '<span>Open in Drive ↗</span>' +
                '</a>' +
              '</div>' +
              actionButtons +
            '</div>';

          grid.appendChild(card);
        });

        // Attach listeners to newly rendered file cards
        grid.querySelectorAll(".btn-view-code").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const fId = btn.getAttribute("data-file-id");
            const file = PROJECT_FILES.find(function (f) { return f.id === fId; });
            if (file) openCodeViewer(file);
          });
        });

        grid.querySelectorAll(".btn-dl-file").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const fId = btn.getAttribute("data-file-id");
            const file = PROJECT_FILES.find(function (f) { return f.id === fId; });
            if (file) {
              const content = getProjectFileContent(file);
              downloadBlobFile(file.name, content, file.mime);
            }
          });
        });

        grid.querySelectorAll(".btn-view-img").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const fId = btn.getAttribute("data-file-id");
            const file = PROJECT_FILES.find(function (f) { return f.id === fId; });
            if (file && file.presetKey && PRESET_IMAGES[file.presetKey]) {
              window.open(PRESET_IMAGES[file.presetKey], "_blank");
            }
          });
        });

        grid.querySelectorAll(".btn-dl-img").forEach(function (btn) {
          btn.addEventListener("click", function () {
            const fId = btn.getAttribute("data-file-id");
            const file = PROJECT_FILES.find(function (f) { return f.id === fId; });
            if (file && file.presetKey && PRESET_IMAGES[file.presetKey]) {
              downloadBase64Image(file.name, PRESET_IMAGES[file.presetKey]);
            }
          });
        });
      }

      function renderAll() {
        renderStoreIdQuickPills();
        renderStoresSection();
        renderItemsGrid();
        renderOrdersSection();
        renderMerchantSettingsSelectors();
        renderProjectFilesGrid();
        saveStateToStorage();
      }

      // ===================================================================
      // WIRE UP ALL EVENT LISTENERS ON DOM READY
      // ===================================================================
      function initEventListeners() {
        // Role switcher on Login Screen
        document.getElementById("roleBtnCustomer").addEventListener("click", function () {
          setInitialRoleChoice("customer");
        });
        document.getElementById("roleBtnMerchant").addEventListener("click", function () {
          setInitialRoleChoice("merchant");
        });

        const otpIds = ["otpDigit1", "otpDigit2", "otpDigit3", "otpDigit4", "otpDigit5", "otpDigit6"];

        function clearOtpInputs() {
          otpIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.value = "";
          });
          const err = document.getElementById("otpErrorMsg");
          if (err) err.classList.add("hidden");
        }

        // Real-Time Cellular SMS Dispatch via Firebase Phone Auth
        document.getElementById("phoneLoginForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const rawPhone = document.getElementById("mobileInput").value.replace(/\D/g, "");
          const errEl = document.getElementById("phoneErrorMsg");
          if (rawPhone.length < 10) {
            errEl.classList.remove("hidden");
            return;
          }
          errEl.classList.add("hidden");
          const e164Phone = "+91" + rawPhone;
          state.userPhone = "+91 " + rawPhone.slice(0, 5) + " " + rawPhone.slice(5, 10);

          const submitBtn = document.getElementById("btnSendOtp");
          const origBtnHtml = submitBtn.innerHTML;
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Connecting Carrier SMS...</span>';

          if (typeof firebase !== "undefined" && firebase.auth) {
            try {
              if (!recaptchaVerifier) {
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
                  size: "invisible",
                  callback: function () {}
                });
              }

              firebase.auth().signInWithPhoneNumber(e164Phone, recaptchaVerifier)
                .then(function (result) {
                  confirmationResult = result;
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = origBtnHtml;

                  document.getElementById("displayPhoneTarget").textContent = state.userPhone;
                  document.getElementById("authStepPhone").classList.add("hidden");
                  document.getElementById("authStepOtp").classList.remove("hidden");

                  clearOtpInputs();
                  document.getElementById("otpDigit1").focus();
                  showToast("Real SMS Dispatched!", "Check your phone messages for the 6-digit code sent to " + state.userPhone, "success");
                })
                .catch(function (error) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = origBtnHtml;
                  console.error("Firebase Phone Auth error:", error);
                  showToast("SMS Error", error.message || "Failed to dispatch SMS. Please check cellular connection.", "error");
                });
            } catch (err) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = origBtnHtml;
              showToast("Error", err.message || "Authentication service unavailable", "error");
            }
          } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
            showToast("Firebase Loading", "Please refresh the page to connect real SMS services.", "error");
          }
        });

        // Back to phone button
        document.getElementById("btnBackToPhone").addEventListener("click", function () {
          document.getElementById("authStepOtp").classList.add("hidden");
          document.getElementById("authStepPhone").classList.remove("hidden");
        });

        // Resend real cellular SMS button
        document.getElementById("btnResendOtp").addEventListener("click", function () {
          const rawPhone = document.getElementById("mobileInput").value.replace(/\D/g, "");
          const e164Phone = "+91" + rawPhone;
          if (typeof firebase !== "undefined" && firebase.auth && recaptchaVerifier) {
            showToast("Resending SMS...", "Re-contacting carrier for " + state.userPhone, "info");
            firebase.auth().signInWithPhoneNumber(e164Phone, recaptchaVerifier)
              .then(function (result) {
                confirmationResult = result;
                clearOtpInputs();
                document.getElementById("otpDigit1").focus();
                showToast("New SMS Sent!", "A fresh 6-digit code has been sent to your device.", "success");
              })
              .catch(function (err) {
                showToast("Resend Failed", err.message, "error");
              });
          }
        });

        // 6-digit OTP boxes auto-advance and paste handling
        otpIds.forEach(function (id, idx) {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener("input", function (ev) {
            if (el.value.length >= 1 && idx < otpIds.length - 1) {
              document.getElementById(otpIds[idx + 1]).focus();
            }
          });
          el.addEventListener("keydown", function (ev) {
            if (ev.key === "Backspace" && el.value === "" && idx > 0) {
              document.getElementById(otpIds[idx - 1]).focus();
            }
          });
          el.addEventListener("paste", function (ev) {
            ev.preventDefault();
            const pasteData = (ev.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
            if (pasteData.length >= 6) {
              for (let i = 0; i < 6; i++) {
                const box = document.getElementById(otpIds[i]);
                if (box) box.value = pasteData[i] || "";
              }
              document.getElementById(otpIds[5]).focus();
            }
          });
        });

        // Step 2: Verify Real Cellular 6-digit OTP Form
        document.getElementById("otpVerifyForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const enteredOtp = otpIds.map(function (id) {
            return (document.getElementById(id).value || "").trim();
          }).join("");

          const errEl = document.getElementById("otpErrorMsg");
          if (enteredOtp.length < 6) {
            if (errEl) {
              errEl.textContent = "Please enter all 6 digits of the SMS code sent to your phone.";
              errEl.classList.remove("hidden");
            }
            return;
          }
          if (errEl) errEl.classList.add("hidden");

          const verifyBtn = document.getElementById("btnVerifyOtp");
          const verifyText = document.getElementById("btnVerifyOtpText");
          if (verifyBtn) verifyBtn.disabled = true;
          if (verifyText) verifyText.textContent = "Verifying Cellular Code...";

          if (confirmationResult) {
            confirmationResult.confirm(enteredOtp)
              .then(function (res) {
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyText) verifyText.textContent = "Verify SMS Code & Login";
                if (res && res.user && res.user.phoneNumber) {
                  state.userPhone = res.user.phoneNumber;
                }
                showToast("Phone Verified", "Identity confirmed via cellular SMS.", "success");
                completeLoginAndEnterApp();
              })
              .catch(function (err) {
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyText) verifyText.textContent = "Verify SMS Code & Login";
                console.error("Firebase confirmation error:", err);
                if (errEl) {
                  errEl.textContent = "Incorrect SMS code. Please check the SMS on your phone and try again.";
                  errEl.classList.remove("hidden");
                }
                showToast("Verification Failed", "Incorrect 6-digit code. Check your phone SMS.", "error");
              });
          } else {
            if (verifyBtn) verifyBtn.disabled = false;
            if (verifyText) verifyText.textContent = "Verify SMS Code & Login";
            completeLoginAndEnterApp();
          }
        });

        // Location Permission Controls
        document.getElementById("btnGrantLocation").addEventListener("click", function () {
          grantLocationPermission();
        });
        document.getElementById("btnHeaderLocation").addEventListener("click", function () {
          const banner = document.getElementById("locationPermissionBanner");
          if (banner.classList.contains("hidden")) {
            banner.classList.remove("hidden");
          } else {
            grantLocationPermission();
          }
        });
        document.getElementById("cityDistrictSelect").addEventListener("change", function () {
          if (state.locationGranted) {
            grantLocationPermission();
          }
        });

        // Top Navigation Tabs & Footer shortcuts
        document.getElementById("navBrandHome").addEventListener("click", function () {
          state.selectedStoreId = "ALL";
          switchMainTab("discover");
          renderAll();
        });
        document.getElementById("tabBtnDiscover").addEventListener("click", function () {
          switchMainTab("discover");
        });
        document.getElementById("tabBtnOrders").addEventListener("click", function () {
          switchMainTab("orders");
        });
        document.getElementById("tabBtnSettings").addEventListener("click", function () {
          switchMainTab("settings");
        });
        document.getElementById("btnOpenRegisterShortcut").addEventListener("click", function () {
          switchMainTab("settings");
        });
        document.getElementById("btnBackToShoppingFromOrders").addEventListener("click", function () {
          switchMainTab("discover");
        });
        document.getElementById("footerLinkDiscover").addEventListener("click", function () {
          switchMainTab("discover");
        });
        document.getElementById("footerLinkOrders").addEventListener("click", function () {
          switchMainTab("orders");
        });
        document.getElementById("footerLinkRegister").addEventListener("click", function () {
          switchMainTab("settings");
        });

        // Sign Out / Switch Phone
        document.getElementById("btnSignOut").addEventListener("click", function () {
          document.getElementById("mainAppShell").classList.add("hidden");
          document.getElementById("authScreen").classList.remove("hidden");
          document.getElementById("authStepOtp").classList.add("hidden");
          document.getElementById("authStepPhone").classList.remove("hidden");
        });

        // Global Search Input (Store ID, Shop Name, Item)
        const searchInput = document.getElementById("globalSearchInput");
        const clearSearchBtn = document.getElementById("btnClearSearch");
        searchInput.addEventListener("input", function () {
          state.searchQuery = searchInput.value;
          if (state.searchQuery.trim().length > 0) {
            clearSearchBtn.classList.remove("hidden");
          } else {
            clearSearchBtn.classList.add("hidden");
          }
          // If the user typed an exact Store ID, highlight it automatically
          const exactStore = state.stores.find(function (s) {
            return s.id.toLowerCase() === state.searchQuery.trim().toLowerCase();
          });
          if (exactStore) {
            state.selectedStoreId = exactStore.id;
          }
          renderAll();
        });

        clearSearchBtn.addEventListener("click", function () {
          searchInput.value = "";
          state.searchQuery = "";
          state.selectedStoreId = "ALL";
          clearSearchBtn.classList.add("hidden");
          renderAll();
        });

        document.getElementById("btnShowAllStores").addEventListener("click", function () {
          state.selectedStoreId = "ALL";
          state.searchQuery = "";
          searchInput.value = "";
          clearSearchBtn.classList.add("hidden");
          renderAll();
        });

        // Category Pills & Sort Select
        document.querySelectorAll(".cat-pill").forEach(function (pill) {
          pill.addEventListener("click", function () {
            state.selectedCategory = pill.getAttribute("data-cat") || "all";
            document.querySelectorAll(".cat-pill").forEach(function (p) {
              p.className = "cat-pill px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-sand transition";
            });
            pill.className = "cat-pill px-3.5 py-2 rounded-xl text-xs font-semibold bg-espresso text-white transition";
            renderItemsGrid();
          });
        });

        document.getElementById("sortSelect").addEventListener("change", function (e) {
          state.sortBy = e.target.value;
          renderItemsGrid();
        });

        // Modal 1 Controls (Photo / Video Reel / Close / Reserve / Buy)
        document.getElementById("btnCloseDetailModal").addEventListener("click", function () {
          document.getElementById("itemDetailModal").classList.add("hidden");
          stopModalVideoShowcase();
        });
        document.getElementById("btnModalMediaPhoto").addEventListener("click", function () {
          switchModalMediaTab("photo");
        });
        document.getElementById("btnModalMediaVideo").addEventListener("click", function () {
          switchModalMediaTab("video");
        });
        document.getElementById("btnToggleCanvasVideo").addEventListener("click", function () {
          isCanvasVideoPlaying = !isCanvasVideoPlaying;
          document.getElementById("btnToggleCanvasVideo").textContent = isCanvasVideoPlaying ? "⏸ Pause Reel" : "▶ Play Reel";
        });
        document.getElementById("btnModalReserveAction").addEventListener("click", function () {
          if (state.activeModalItemId) openCheckoutModal(state.activeModalItemId, "reserve");
        });
        document.getElementById("btnModalBuyDirectAction").addEventListener("click", function () {
          if (state.activeModalItemId) openCheckoutModal(state.activeModalItemId, "buy");
        });

        // Modal 2 Controls (Checkout Reserve vs Direct Buy & Confirm Payment)
        document.getElementById("btnCloseCheckoutModal").addEventListener("click", function () {
          document.getElementById("checkoutModal").classList.add("hidden");
        });
        document.getElementById("chkSwitchReserve").addEventListener("click", function () {
          state.checkoutMode = "reserve";
          updateCheckoutModalUI();
        });
        document.getElementById("chkSwitchBuy").addEventListener("click", function () {
          state.checkoutMode = "buy";
          updateCheckoutModalUI();
        });

        document.getElementById("confirmPaymentForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const item = state.items.find(function (i) { return i.id === state.activeModalItemId; });
          if (!item) return;

          const store = state.stores.find(function (s) { return s.id === item.storeId; }) || state.stores[0];
          const activeColor = item.colors[item.selectedColorIndex] || item.colors[0];
          const reserveAmt = Math.round((item.price * item.reservePct) / 100);
          const isReserve = state.checkoutMode === "reserve";
          const paidNow = isReserve ? reserveAmt : item.price;
          const balanceDue = isReserve ? item.price - reserveAmt : 0;

          if (activeColor.stock > 1) {
            activeColor.stock -= 1;
          }

          const newOrder = {
            orderId: "PKP-" + Math.floor(1000 + Math.random() * 9000),
            type: isReserve ? "RESERVED (" + item.reservePct + "% Token Paid)" : "DIRECT BUY (100% Paid in Full)",
            itemTitle: item.title,
            colorName: activeColor.name,
            storeId: item.storeId,
            storeName: store.name,
            storeAddress: store.address,
            fullPrice: item.price,
            paidAmount: paidNow,
            balanceDue: balanceDue,
            pickupSlot: document.getElementById("chkPickupSlot").value,
            timestamp: "Just now • Express Counter Ready"
          };

          state.orders.unshift(newOrder);
          document.getElementById("checkoutModal").classList.add("hidden");
          renderAll();
          switchMainTab("orders");

          showToast(
            "Payment of " + formatINR(paidNow) + " Confirmed!",
            "Pickup Pass " + newOrder.orderId + " generated for Store " + item.storeId + ".",
            "success"
          );
        });

        // Merchant Portal: Regenerate Unique Store ID
        document.getElementById("btnRegenerateStoreId").addEventListener("click", function () {
          document.getElementById("previewNewStoreId").textContent = generateRandomStoreId();
        });

        // Merchant Portal: Register New Store Form
        document.getElementById("registerStoreForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const newId = document.getElementById("previewNewStoreId").textContent.trim();
          const name = document.getElementById("regStoreName").value.trim();
          const type = document.getElementById("regStoreType").value;
          const pickupMins = document.getElementById("regStorePickupMins").value;
          const address = document.getElementById("regStoreAddress").value.trim();
          const distance = document.getElementById("regStoreDistance").value.trim();
          const specialty = document.getElementById("regStoreSpecialty").value.trim();

          if (!name) return;

          const newStoreObj = {
            id: newId,
            name: name,
            type: type,
            address: address,
            distance: distance,
            distanceNum: 0.5,
            pickupMins: pickupMins,
            rating: "5.0 ★ New",
            specialty: specialty,
            queueSaved: "Express Krav'n Counter Active"
          };

          state.stores.unshift(newStoreObj);
          state.selectedStoreId = newId;

          // Show confirmation box & prepare next ID
          const successBox = document.getElementById("registeredStoreSuccessBox");
          successBox.classList.remove("hidden");
          document.getElementById("newlyCreatedStoreIdBadge").textContent = newId;
          document.getElementById("newlyCreatedStoreText").textContent =
            name + " is now registered with Store ID " + newId + ". Now upload your first item on the right or view your storefront!";

          document.getElementById("previewNewStoreId").textContent = generateRandomStoreId();
          document.getElementById("regStoreName").value = "";
          document.getElementById("regStoreSpecialty").value = "";

          renderAll();
          document.getElementById("itemStoreSelect").value = newId;

          showToast(
            "Store Registered! ID: " + newId,
            name + " is now searchable by Store ID " + newId + " on the Home page.",
            "success"
          );
        });

        document.getElementById("btnViewNewStoreOnHome").addEventListener("click", function () {
          switchMainTab("discover");
        });

        // Merchant Portal: Add Custom Colour Swatch
        document.getElementById("btnAddCustomColor").addEventListener("click", function () {
          const hex = document.getElementById("customColorHex").value || "#C85A32";
          const nameInput = document.getElementById("customColorName");
          const stockInput = document.getElementById("customColorStock");
          const name = nameInput.value.trim() || "Custom Shade";
          const stock = parseInt(stockInput.value, 10) || 4;

          state.merchantSwatches.push({
            name: name,
            hex: hex,
            stock: stock,
            selected: true
          });
          nameInput.value = "";
          renderMerchantSettingsSelectors();
          showToast("Added Colour Swatch: " + name, stock + " units added to item colour options.", "success");
        });

        // Merchant Portal: Handle File Inputs for Photo & Video
        document.getElementById("itemPhotoFileInput").addEventListener("change", function (e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function (ev) {
            state.uploadedPhotoDataUrl = ev.target.result;
            showToast("Item Photo Loaded", file.name + " ready to publish.", "success");
          };
          reader.readAsDataURL(file);
        });

        document.getElementById("itemVideoFileInput").addEventListener("change", function (e) {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          state.uploadedVideoObjectUrl = URL.createObjectURL(file);
          showToast("Merchant Video Reel Loaded", file.name + " attached for live customer preview.", "success");
        });

        // Merchant Portal: Upload Item to Store Form
        document.getElementById("uploadItemForm").addEventListener("submit", function (e) {
          e.preventDefault();
          const storeId = document.getElementById("itemStoreSelect").value;
          const title = document.getElementById("itemTitleInput").value.trim();
          const price = parseInt(document.getElementById("itemPriceInput").value, 10) || 1990;
          const reservePct = parseInt(document.getElementById("itemReservePctInput").value, 10) || 15;
          const category = document.getElementById("itemCategoryInput").value;
          const qualityGrade = document.getElementById("itemQualityGradeInput").value;
          const qualitySpecs = document.getElementById("itemQualityNotesInput").value.trim();
          const presetKey = document.getElementById("itemPresetPhotoSelect").value;
          const videoStyle = document.getElementById("itemVideoStyleSelect").value;

          if (!title) return;

          const activeColors = state.merchantSwatches
            .filter(function (s) { return s.selected; })
            .map(function (s) {
              return { name: s.name, hex: s.hex, stock: s.stock };
            });

          if (activeColors.length === 0) {
            activeColors.push({ name: "Signature Classic", hex: "#C85A32", stock: 5 });
          }

          const newItem = {
            id: "ITM-" + Math.floor(200 + Math.random() * 800),
            storeId: storeId,
            title: title,
            category: category,
            price: price,
            reservePct: reservePct,
            qualityGrade: qualityGrade,
            qualitySpecs: qualitySpecs,
            image: state.uploadedPhotoDataUrl || PRESET_IMAGES[presetKey] || PRESET_IMAGES.linen,
            videoStyle: videoStyle,
            uploadedVideoUrl: state.uploadedVideoObjectUrl || null,
            colors: activeColors,
            selectedColorIndex: 0
          };

          state.items.unshift(newItem);
          state.selectedStoreId = storeId;
          state.selectedCategory = "all";
          state.uploadedPhotoDataUrl = null;
          state.uploadedVideoObjectUrl = null;

          document.getElementById("itemTitleInput").value = "";
          document.getElementById("itemPhotoFileInput").value = "";
          document.getElementById("itemVideoFileInput").value = "";

          renderAll();
          switchMainTab("discover");

          showToast(
            "Published to Store " + storeId + "!",
            title + " (" + formatINR(price) + ") is now live for Direct Buy or " + reservePct + "% Reservation.",
            "success"
          );
        });
      }

      // Initialize App
      loadStateFromStorage();
      initEventListeners();
      renderAll();
    })();