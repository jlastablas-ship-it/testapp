
        const lista_elementos= Array.from(document.getElementsByTagName("template"));
        lista_elementos.forEach(function (elemento) {
            console.log(elemento);
          //  elemento2 = document.getElementById("draggable")
          //  elemento2.id = "draggable" + elemento.valueOf();
            document.getElementById("array-container").innerHTML +=
                //  "<div class='ui-draggable ui-resizable card m-2 p-4 w-fit text-center'>" +  elemento +   "</div>";
                elemento.innerHTML;

        });

        document.querySelectorAll(".window-card").forEach(function (cuadro) {
            cuadro.addEventListener("click", function () {
                 alert("Has hecho clic en el número: " + this.textContent);
            });
        });


        $(function () {
            $(".window-card").draggable({
                handle: ".window-header",
                containment: ".container",
                stack: ".window-card",

            });
            $(".window-card").resizable({
                containment: ".container",
                minHeight: 250,
                minWidth: 200,

            });
        });

        function windowMaximizeViewport(id) {
            const $win = $(`#${id}`);
            const isFull = $win.hasClass('pseudo-fullscreen');
            if (isFull) { $win.removeClass('pseudo-fullscreen'); $win.draggable('enable'); $win.resizable('enable'); }
            else { $win.addClass('pseudo-fullscreen'); $win.draggable('disable'); $win.resizable('disable'); }
        }

        function windowMaximizeInMain(id) {
            const $win = $(`#${id}`);
            const $main = $('#array-container');
            if ($win.hasClass('pseudo-fullscreen')) windowMaximizeViewport(id);
            const isMaximized = $win.width() >= $main.width() - 5 && $win.position().top === 0;
            if (isMaximized) { $win.css({ top: '50px', left: '50px', width: '450px', height: '350px' }); }
            else { $win.css({ top: 0, left: 0, width: $main.width() + 'px', height: $main.height() + 'px' }); }
        }

        function windowToggleMinimize(id) {
            const $win = $(`#${id}`);
            if ($win.hasClass('pseudo-fullscreen')) windowMaximizeViewport(id);
            $win.toggleClass('minimized');
            $win.hasClass('minimized') ? $win.resizable('disable') : $win.resizable('enable');
        }
                  function removeWindow(id) {
                $(`#${id}`).fadeOut(200, function() {
                    $(this).remove();
                    state.activeWindows = state.activeWindows.filter(w => w.id !== id);
                    updateWindowsNav();
                });
            }
    

