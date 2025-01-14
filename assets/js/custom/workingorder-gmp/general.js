"use strict";

// Class definition
var KTWorkingOrderGMPGeneral = (function () {
    // Elements
    var form;
    var submitButton;

    var handleSubmitAjax = function (e) {
        // Handle form submit
        submitButton.addEventListener("click", function (e) {
            // Prevent button default action
            e.preventDefault();

            // Show loading indication
            submitButton.setAttribute("data-kt-indicator", "on");

            // Disable button to avoid multiple click
            submitButton.disabled = true;

            // Check axios library docs: https://axios-http.com/docs/intro
            axios
                .post(
                    submitButton.closest("form").getAttribute("action"),
                    new FormData(form)
                )
                .then(function (response) {
                    if (response) {
                        form.reset();

                        // Show message popup. For more info check the plugin's official documentation: https://sweetalert2.github.io/
                        Swal.fire({
                            text: "Berhasil menambahkan permintaan pekerjaan",
                            icon: "success",
                            buttonsStyling: false,
                            confirmButtonText: "Ok, got it!",
                            customClass: {
                                confirmButton: "btn btn-primary",
                            },
                        });
                    } else {
                        // Show error popup. For more info check the plugin's official documentation: https://sweetalert2.github.io/
                        Swal.fire({
                            text: "Maaf, data yang anda masukkan salah!",
                            icon: "error",
                            buttonsStyling: false,
                            confirmButtonText: "Ok, got it!",
                            customClass: {
                                confirmButton: "btn btn-primary",
                            },
                        });
                    }
                })
                .catch(function (error) {
                    Swal.fire({
                        // text: "Sorry, looks like there are some errors detected, please try again.",
                        text: error.response.data.errors.foto_temuan[0],
                        icon: "error",
                        buttonsStyling: false,
                        confirmButtonText: "Ok, got it!",
                        customClass: {
                            confirmButton: "btn btn-primary",
                        },
                    });
                })
                .then(() => {
                    // Hide loading indication
                    submitButton.removeAttribute("data-kt-indicator");

                    // Enable button
                    submitButton.disabled = false;
                });
        });
    };

    var isValidUrl = function (url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    // Public functions
    return {
        // Initialization
        init: function () {
            form = document.querySelector("#kt_working_order_form");
            submitButton = document.querySelector("#kt_working_order_submit");

            if (
                isValidUrl(submitButton.closest("form").getAttribute("action"))
            ) {
                handleSubmitAjax(); // use for ajax submit
            }
        },
    };
})();

// On document ready
KTUtil.onDOMContentLoaded(function () {
    KTWorkingOrderGMPGeneral.init();
});
