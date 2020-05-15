function SingleConvState(input) {
    this.input = input;
    this.answer = '';
    this.next = false;
    return this;
};
SingleConvState.prototype.hasNext = function() {
    return this.next;
};

function ConvState(wrapper, SingleConvState, form, params, originalFormHtml) {
    this.form = form;
    this.wrapper = wrapper;
    this.current = SingleConvState;
    this.answers = {};
    this.parameters = params;
    this.originalFormHtml = originalFormHtml;
    this.scrollDown = function() {
        $(this.wrapper).find('#messages').stop().animate({ scrollTop: $(this.wrapper).find('#messages')[0].scrollHeight }, 600);
    }.bind(this);
};

ConvState.prototype.next = function() {
    if (this.current.hasNext()) {
        this.current = this.current.next;
        if (this.current.input.hasOwnProperty('fork') && this.current.input.hasOwnProperty('case')) {
            if (this.answers.hasOwnProperty(this.current.input.fork) && this.answers[this.current.input.fork].value != this.current.input.case) {
                return this.next();
            }
            if (!this.answers.hasOwnProperty(this.current.input.fork)) {
                return this.next();
            }
        }
        return true;
    } else {
        return false;
    }
};

ConvState.prototype.printQuestion = function() {
    var questions = this.current.input.questions;
    var question = questions[Math.floor(Math.random() * questions.length)];
    var messageObj = $(this.wrapper).find('.message.typing');
    setTimeout(function() {
        messageObj.html(question);
        var heightMessage = ($(messageObj).height() + 15) * (-1);
        $(messageObj).append($('<svg id="site" class="bi bi-circle" width="2em" height="2em" viewBox="0 0 16 16" fill="rgb(84, 153, 42)" xmlns="http://www.w3.org/2000/svg" style="margin-top:' + heightMessage + 'px;"><path fill-rule="nonzero" fill="white"  d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><image x="2" y="2" width="12" height="12" xlink:href="media/site.png"></svg>'));
        messageObj.removeClass('typing').addClass('ready');

        if (this.current.input.type == "select") {
            this.printAnswers(this.current.input.answers, this.current.input.multiple);
        }
        this.scrollDown();
        if (this.current.input.hasOwnProperty('noAnswer') && this.current.input.noAnswer === true) {
            if (this.next()) {
                setTimeout(function() {
                    var messageObj = $('<div class="message to typing"><div class="typing_loader"></div></div>');
                    $(this.wrapper).find('#messages').append(messageObj);
                    this.scrollDown();
                    this.printQuestion();
                }.bind(this), 200);
            } else {
                this.parameters.eventList.onSubmitForm(this);
            }
        }
        $(this.wrapper).find(this.parameters.inputIdHashTagName).focus();
    }.bind(this), 500);
};

ConvState.prototype.printAnswers = function(answers, multiple) {
    var opened = false;
    for (var i in answers) {
        if (answers.hasOwnProperty(i)) {
            var option = $('<div class="option">' + answers[i].text + '</div>')
                .data("answer", answers[i])
                .click(function(event) {
                    this.current.input.selected = $(event.target).data("answer").value;
                    this.wrapper.find(this.parameters.inputIdHashTagName).removeClass('error');
                    this.wrapper.find(this.parameters.inputIdHashTagName).val('');
                    this.answerWith($(event.target).data("answer").text, $(event.target).data("answer"));
                    this.wrapper.find('div.options div.option').remove();
                }.bind(this));
            this.wrapper.find('div.options').append(option);
        }
    }
    if (!opened) {
        var diff = $(this.wrapper).find('div.options').height();
        var originalHeight = $(this.wrapper).find('.wrapper-messages').height();
        $(this.wrapper).find('.wrapper-messages').data('originalHeight', originalHeight);
        $(this.wrapper).find('.wrapper-messages').css({ marginBottom: diff, maxHeight: originalHeight - diff });
    }
};

ConvState.prototype.answerWith = function(answerText, answerObject) {
    if (this.current.input.hasOwnProperty('name')) {
        if (typeof answerObject != 'string') {
            this.answers[this.current.input.name] = answerObject;
            this.current.answer = answerObject;
        }
        if (this.current.input.type != 'select' && !this.current.input.multiple) {
            $(this.current.input.element).val(answerObject).change();
        }
    }
    
    if (this.current.input.type == 'password')
        answerText = answerText.replace(/./g, '*');
    var message = $('<div class="message from"><svg id="rec" class="bi bi-circle" width="2em" height="2em" viewBox="0 0 16 16" fill="rgb(84, 153, 42)" xmlns="http://www.w3.org/2000/svg"><path fill-rule="nonzero" fill="white"  d="M8 15A7 7 0 108 1a7 7 0 000 14zm0 1A8 8 0 108 0a8 8 0 000 16z" clip-rule="evenodd"/><image x="2" y="2" width="12" height="12" xlink:href="media/rec.png"></svg>' + answerText + '</div>');

    $(this.wrapper).find("div.options div.option").remove();

    var diff = $(this.wrapper).find('div.options').height();
    var originalHeight = $(this.wrapper).find('.wrapper-messages').data('originalHeight');
    $(this.wrapper).find('.wrapper-messages').css({ marginBottom: diff, maxHeight: originalHeight });
    $(this.wrapper).find(this.parameters.inputIdHashTagName).focus();
    if (answerObject.hasOwnProperty('callback')) {
        this.current.input['callback'] = answerObject.callback;
    }
    setTimeout(function() {
        $(this.wrapper).find("#messages").append(message);
        this.scrollDown();
    }.bind(this), 100);

    $(this.form).append(this.current.input.element);
    var messageObj = $('<div class="message to typing"><div class="typing_loader"></div></div>');
    setTimeout(function() {
        $(this.wrapper).find('#messages').append(messageObj);
        this.scrollDown();
    }.bind(this), 150);

    this.parameters.eventList.onInputSubmit(this, function() {
        if (this.next()) {
            setTimeout(function() {
                this.printQuestion();
            }.bind(this), 300);
        } else {
            this.parameters.eventList.onSubmitForm(this);
        }
    }.bind(this));
};

(function($) {
    $.fn.convform = function(options) {
        var wrapper = this;
        var originalFormHtml = $(wrapper).html();
        $(this).addClass('conv-form-wrapper');

        var parameters = $.extend(true, {}, {
            typeInputUi: 'textarea',
            timeOutFirstQuestion: 600,
            eventList: {
                onSubmitForm: function(convState) {
                    console.log('completed');
                    convState.form.submit();
                    return true;
                },
                onInputSubmit: function(convState, readyCallback) {
                    if (convState.current.input.hasOwnProperty('callback')) {
                        if (typeof convState.current.input.callback === 'string') {
                            window[convState.current.input.callback](convState, readyCallback);
                        }
                    } else {
                        readyCallback();
                    }
                }
            },
        }, options);

        var inputs = $(this).find('input, select, textarea').map(function() {
            var input = {};
            if ($(this).attr('name'))
                input['name'] = $(this).attr('name');
            input['questions'] = $(this).attr('data-conv-question').split("|");
            if ($(this).is('select')) {
                input['type'] = 'select';
                input['answers'] = $(this).find('option').map(function() {
                    var answer = {};
                    answer['text'] = $(this).text();
                    answer['value'] = $(this).val();
                    if ($(this).attr('data-callback'))
                        answer['callback'] = $(this).attr('data-callback');
                    return answer;
                }).get();
            }
            if ($(this).parent('div[data-conv-case]').length) {
                input['case'] = $(this).parent('div[data-conv-case]').attr('data-conv-case');
                input['fork'] = $(this).parent('div[data-conv-case]').parent('div[data-conv-fork]').attr('data-conv-fork');
            }
            return input;
        }).get();

        if (inputs.length) {
            var form = $(wrapper).find('form').hide();

            switch (parameters.typeInputUi) {
                case 'textarea':
                    inputForm = $('<form id="' + parameters.formIdName + '" class="convFormDynamic"><div class="options dragscroll"></div><textarea id="' + parameters.inputIdName + '" rows="1" placeholder="' + parameters.placeHolder + '" class="userInputDynamic"></textarea><button type="submit" class="submit">' + parameters.buttonText + '</button><span class="clear"></span></form>');
                    break;
            }

            $(wrapper).append('<div class="wrapper-messages"><div class="spinLoader ' + parameters.loadSpinnerVisible + ' "></div><div id="messages"></div></div>');
            $(wrapper).append(inputForm);

            var singleState = new SingleConvState(inputs[0]);
            var state = new ConvState(wrapper, singleState, form, parameters, originalFormHtml);
            for (var i in inputs) {
                if (i != 0 && inputs.hasOwnProperty(i)) {
                    singleState.next = new SingleConvState(inputs[i]);
                    singleState = singleState.next;
                }
            }

            setTimeout(function() {
                $.when($('div.spinLoader').addClass('hidden')).done(function() {
                    var messageObj = $('<div class="message to typing"><div class="typing_loader"></div></div>');
                    $(state.wrapper).find('#messages').append(messageObj);
                    state.scrollDown();
                    state.printQuestion();
                });
            }, parameters.timeOutFirstQuestion);

            return state;
        } else {
            return false;
        }
    }

})(jQuery);
