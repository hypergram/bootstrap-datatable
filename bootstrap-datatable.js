/*!
 * Bootstrap Data Table Plugin v1.5.6
 *
 * Author: Jeff Dupont
 * Author: Nick Goodliff (Project 53)
 * ==========================================================
 * Copyright 2012
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================
 */


; (function ($) {

    /* DATATABLE CLASS DEFINITION
     * ========================== */
    var DataTable = function (element, options) {
        this.$element = $(element);
        this.options = options;
        this.enabled = true;
        this.columns = [];
        this.rows = [];
        this.buttons = [];

        // this needs to be handled better
        this.localStorageId = "datatable_" + (options.id || options.url.replace(/\W/ig, '_'));

        // set the defaults for the column options array
        for (var column in this.options.columns) {
            // check sortable
            if (typeof this.options.columns[column].sortable === undefined)
                this.options.columns[column].sortable = true;
        }

        this.$element.addClass("clearfix");

        if (this.options.tablePreRender && typeof this.options.tablePreRender === 'function')
            this.options.tablePreRender.call(this)

        if (this.options.autoLoad === true) this.render();
    };

    DataTable.prototype = {

        constructor: DataTable

      , render: function () {
          var o = this.options
            , $e = this.$element;

          // show loading
          this.loading(true);

          // reset the columns and rows
          this.columns = [];
          this.rows = [];
          this.buttons = [];
          this.$wrapper = undefined;
          this.$table = undefined;
          this.$header = undefined;
          this.$body = undefined;
          this.$footer = undefined;
          this.$pagination = undefined;

          // top
          this.$top_details = $("<div></div>")
            .addClass("dt-top-details");
          // bottom
          this.$bottom_details = $("<div></div>")
            .addClass("dt-bottom-details");

          var curPage = 0;
          var curSort;
          if (localStorage) {
              var now = new Date();
              var t = new Date(localStorage[this.localStorageId + '.time']);
              if (now.getTime() - t.getTime() > 1000 * 60 * 10) {
                  curPage = localStorage[this.localStorageId + '.page'];
                  try {
                      curSort = JSON.parse(localStorage[this.localStorageId + '.sort']);
                  } catch (e) {
                  }
              }
          }
          if (curPage)
              o.currentPage = curPage;
          if (curSort)
              o.sort = curSort;
          // localize the object
          var that = this;

          // pull in the data from the ajax call
          if (o.url !== "") {
              $.ajax({
                  url: o.url
                , type: "POST"
                , dataType: "json"
                , data: $.extend({}, o.post, {
                    currentPage: o.currentPage
                    , perPage: o.perPage
                    , sort: o.sort
                    , filtering: o.filter
                })
                , success: function (res) {
                    that.resultset = res;

                    // clear out the current elements in the container
                    $e.empty();

                    if (res.Result == "ERROR") {
                        console.log(res);
                        $e.append("An error has occurred.");
                        that.loading(false);
                    }
                    else {
                        // set the sort and filter configuration
                        o.sort = res.sort;
                        o.filter = res.filter;
                        o.totalRows = res.totalRows;

                        // set the current page if we're forcing it from the server
                        if (res.currentPage) o.currentPage = parseInt(res.currentPage);

                        // append the table
                        $e.append(that.table());

                        // append the detail boxes
                        $e.prepend(that.$top_details);
                        $e.append(that.$bottom_details);

                        // render the rest of the table
                        if (o.showHeader) that.header();
                        if (o.showFooter) that.footer();

                        // fill in the table body
                        that.body();

                        // render the pagination
                        if (o.showTopPagination && that.pagination())
                            that.$top_details.append(that.pagination().clone(true));
                        if (o.showPagination && that.pagination())
                            that.$bottom_details.append(that.pagination().clone(true));

                        // update the details for the results
                        that.details();

                        // nearly complete... let the user apply any final adjustments
                        if (o.tableCallback && typeof o.tableCallback === 'function')
                            o.tableCallback.call(that);

                        that.fadeIn();

                        that.loading(false);
                    }
                }
                , error: function (e) {
                    if (o.debug) console.log(e);
                    showError.call(that);

                    that.loading(false);
                }
              });
          }
      }

      , loading: function (show) {
          var $e = this.$element;

          if (!this.$loading) {
              this.$loading = $("<div></div>")
                .css({
                    position: 'absolute'
                    //, top: parseInt($e.offset().top) + 5
                  , left: Math.floor($e.width() / 4)
                  , width: Math.floor($e.width() / 2) + "px"
                })
                .append(
                  $("<div></div>")
                    .addClass("progress")
                    .append(
                      $('<div role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div>')
                        .addClass("progress-bar progress-bar-primary progress-bar-striped active")
                    )
                )
                .appendTo($e.parent())
          }

          if (show) {
              $e.css({ opacity: 0.2 });
          }
          else {
              $e.css({ opacity: 1 });

              this.$loading.remove();
              this.$loading = undefined;
          }
      }

      , details: function () {
          var o = this.options
            , res = this.resultset
            , start = 0
            , end = 0
            , that = this;

          start = (o.currentPage * o.perPage) - o.perPage + 1
          if (start < 1) start = 1;

          end = (o.currentPage * o.perPage);
          if (end > o.totalRows) end = o.totalRows;

          if (o.totalRows > 0) {
              $('<div class="pull-left"><p>Showing ' + start + ' to ' + end + ' of ' + o.totalRows + ' ' + o.rowsName + '</p></div>')
                .prependTo(this.$bottom_details);
          }
      }
      , fadeIn: function () {
          var o = this.options;

          this.$wrapper.animate({ opacity: 1 }, o.tableFade);
      }

      , table: function () {
          var $e = this.$element
            , o = this.options;

          if (!this.$table_wrapper) {
              this.$wrapper = $("<div></div>")
                .addClass("dt-table-wrapper table-responsive");
          }

          if (!this.$table) {
              this.$table = $('<table></table>')
                .addClass(o.class);
          }

          this.$wrapper.append(this.$table);
          return this.$wrapper;
      }

      , header: function () {
          var o = this.options
            , res = this.resultset;

          if (!this.$header) {
              this.$header = $('<thead></thead>');
              var row = $('<tr></tr>');

              // loop through the columns
              for (var column in o.columns) {
                  var $cell = this.column(column)
                    , colprop = $cell.data("column_properties");

                  // attach the sort click event
                  if (colprop.sortable && !colprop.custom)
                      $cell.click(this, this.sort)
                        .addClass('sortable');

                  for (var i = 0; i < o.sort.length; i++) {
                      if (o.sort[i][0] == colprop.field) {
                          if (o.sort[i][1] == "asc") {
                              $cell.addClass("sorting-asc");
                              colprop.sortOrder = "asc";
                          }
                          else if (o.sort[i][1] == "desc") {
                              $cell.addClass("sorting-desc");
                              colprop.sortOrder = "desc";
                          }
                      }
                  }

                  row.append($cell);
                  this.$header.append(row);
                  this.columns.push($cell);
              }

              // any final user adjustments to the header
              if (o.headerCallback && typeof o.headerCallback === 'function')
                  o.headerCallback.call(this);

              this.$table
                .append(this.$header);
          }
          return this.$header;
      }

      , footer: function () {
          var o = this.options
            , res = this.resultset

          if (!this.$footer) {
              this.$footer = $('<tfoot></tfoot>');

              // loop through the columns
              for (column in o.columns) {
                  var $cell = $('<td></td>')

                  $cell
                    .data("cell_properties", o.columns[column])
                    .addClass(o.columns[column].classname)

                  this.$footer.append($cell);
              }

              // any final user adjustments to the footer
              if (o.footerCallback && typeof o.footerCallback === 'function')
                  o.footerCallback.call(this, this.resultset.footer)

              this.$table
                .append(this.$footer);
          }
          return this.$footer;
      }

      , body: function () {
          var res = this.resultset
            , o = this.options;

          if (!this.$body) {
              this.$body = $('<tbody></tbody>');

              // loop through the results
              for (var i = 0; i < res.data.length; i++) {
                  var row = this.row(res.data[i]);
                  this.$body.append(row);
                  this.rows.push(row);
              }

              if (o.showFilterRow) this.$body.prepend(this.filter());

              this.$table
                .append(this.$body);
          }
          return this.$body;
      }

      , filter: function () {
          var $row = $("<tr></tr>")
            , o = this.options
            , that = this;

          $row.addClass("dt-filter-row");

          // loop through the columns
          for (var column in o.columns) {
              var $cell = $("<td></td>")
                .addClass(o.columns[column].classname);

			if (o.columns[column].hidden) $cell.hide();

			if (o.columns[column].filter && o.columns[column].field) {
				var $f = $('<input class="form-control input-sm input-xs input-filter" />')
					.attr("name", "filter_" + o.columns[column].field)
					.data("filter", o.columns[column].field)
					.val(o.filter[o.columns[column].field] || "")
					// .change(this, this.runFilter)
					.change(function (e) {
						o.currentPage = 1;
						if (localStorage) {
							localStorage[that.localStorageId + '.page'] = o.currentPage;
						}
						runFilter.call(this, that);
					});
				if (o.columns[column].fieldType == 'bool')
					$f.attr('type', 'checkbox').data("filterType", 'bool').val('True').attr('checked', o.filter[o.columns[column].field] == 'True');
				else if(o.columns[column].fieldType == 'lookup') {
					$f = $('<select/>')
						.attr("name", "filter_" + o.columns[column].field)
						.data("filter", o.columns[column].field)
						.change(function (e) {
							o.currentPage = 1;
							if (localStorage) {
								localStorage[that.localStorageId + '.page'] = o.currentPage;
							}
							runFilter.call(this, that);
						});
					o.columns[column].fieldOptions.forEach(function(element) {
						$f.append('<option value="' +element.value+ '" ' + (o.filter[o.columns[column].field] === element.value ? 'selected' : '') + '>'+element.label+'</option>')
					}, this);
				}
				else
					$f.attr('type', 'text');
				$cell.append($f);
			}
			$row.append($cell);
          }
          return $row;
      }

      , row: function (rowdata) {
          var $row = $("<tr></tr>")
            , o = this.options;
          $row.data("row_data", rowdata);
          // loop through the columns
          for (var column in o.columns) {
              var cell = this.cell(rowdata, column);
              $row.append(cell);
          }

          // callback for postprocessing on the row
          if (o.rowCallback && typeof o.rowCallback === "function")
              $row = o.rowCallback($row, rowdata);
          return $row;
      }

      , cell: function (data, column) {
          var celldata = data[this.options.columns[column].field] //|| this.options.columns[column].custom
            , $cell = $('<td></td>')
            , o = this.options;

          // preprocess on the cell data for a column
          if (o.columns[column].callback && typeof o.columns[column].callback === "function")
              celldata = o.columns[column].callback.call($cell, data, o.columns[column])

          $cell
            .data("cell_properties", o.columns[column])
            .addClass(o.columns[column].classname)
            .append(celldata)

          if (o.columns[column].customclass)
              $cell.addClass(o.columns[column].customclass);

          if (o.columns[column].css) $cell.css(o.columns[column].css);

          if (o.columns[column].hidden) $cell.hide();

          return $cell;
      }

      , column: function (column) {
          var $cell = $('<th></th>')
            , o = this.options
            , classname = "dt-column_" + column + Math.floor((Math.random() * 1000) + 1);

          o.columns[column].classname = classname;

          $cell
            .data("column_properties", o.columns[column])
            .addClass(classname)
            .text(o.columns[column].title);

          if (o.columns[column].customheaderclass)
              $cell.addClass(o.columns[column].customheaderclass);


          if (o.columns[column].css) $cell.css(o.columns[column].css);

          if (o.columns[column].hidden) $cell.hide();

          return $cell;
      }

      , sort: function (e) {
          var colprop = $(this).data("column_properties")
            , that = e.data
            , o = e.data.options
            , found = false;

          colprop.sortOrder = colprop.sortOrder ? (colprop.sortOrder == "asc" ? "desc" : "") : "asc";
          if (o.allowMultipleSort) {
              // does the sort already exist?
              for (var i = 0; i < o.sort.length; i++) {
                  if (o.sort[i][0] == colprop.field) {
                      o.sort[i][1] = colprop.sortOrder;
                      if (colprop.sortOrder === "") o.sort.splice(i, 1);
                      found = true;
                  }
              }
              if (!found) o.sort.push([colprop.field, colprop.sortOrder]);
          }
          else {
              // clear out any current sorts
              o.sort = [];
              if(colprop.sortOrder)
                o.sort.push([colprop.field, colprop.sortOrder]);
          }

          if (localStorage) {
              localStorage[that.localStorageId + '.sort'] = JSON.stringify(o.sort);
          }
          o.currentPage = 1;
          that.render();
      }

      , pagination: function () {
          var $e = this.$element
            , that = this
            , o = this.options
            , res = this.resultset;

          // no paging needed
          if (o.perPage >= res.totalRows) return;

          if (!this.$pagination) {
              this.$pagination = $("<div></div>").addClass("pull-right");

              // how many pages?
              o.pageCount = Math.ceil(res.totalRows / o.perPage);

              if (localStorage) {
                  localStorage[that.localStorageId + '.time'] = new Date();
              }
              // setup the pager container and the quick page buttons
              var $pager = $("<ul></ul>").addClass("pagination pagination-sm")
                , $first = $("<li></li>").append(
                    $("<a></a>")
                      .attr("href", "#")
                      .data("page", 1)
                      .html("&laquo;")
                      .click(function () {
                          o.currentPage = 1
                          if (localStorage) {
                              localStorage[that.localStorageId + '.page'] = o.currentPage;
                          }
                          that.render();
                          return false;
                      })
                  )
                , $previous = $("<li></li>").append(
                    $("<a></a>")
                      .attr("href", "#")
                      .data("page", o.currentPage - 1)
                      .html("&lt;")
                      .click(function () {
                          o.currentPage -= 1
                          o.currentPage = o.currentPage >= 1 ? o.currentPage : 1
                          if (localStorage) {
                              localStorage[that.localStorageId + '.page'] = o.currentPage;
                          }
                          that.render();
                          return false;
                      })
                  )
                , $next = $("<li></li>").append(
                    $("<a></a>")
                      .attr("href", "#")
                      .data("page", o.currentPage + 1)
                      .html("&gt;")
                      .click(function () {
                          o.currentPage += 1
                          o.currentPage = o.currentPage <= o.pageCount ? o.currentPage : o.pageCount
                          if (localStorage) {
                              localStorage[that.localStorageId + '.page'] = o.currentPage;
                          }
                          that.render();
                          return false;
                      })
                  )
                , $last = $("<li></li>").append(
                    $("<a></a>")
                      .attr("href", "#")
                      .data("page", o.pageCount)
                      .html("&raquo;")
                      .click(function () {
                          o.currentPage = o.pageCount
                          if (localStorage) {
                              localStorage[that.localStorageId + '.page'] = o.currentPage;
                          }
                          that.render();
                          return false;
                      })
                  );


              var totalPages = o.pagePadding * 2
                , start
                , end;

              if (totalPages >= o.pageCount) {
                  start = 1;
                  end = o.pageCount;
              }
              else {
                  start = o.currentPage - o.pagePadding;
                  if (start <= 0) start = 1;

                  end = start + totalPages;
                  if (end > o.pageCount) {
                      end = o.pageCount;
                      start = end - totalPages;
                  }
              }

              // append the pagination links
              for (var i = start; i <= end; i++) {
                  var $link = $("<li></li>")
                    .append(
                      $("<a></a>")
                        .attr("href", "#")
                        .data("page", i)
                        .text(i)
                        .click(function () {
                            o.currentPage = $(this).data('page')
                            if (localStorage) {
                                localStorage[that.localStorageId + '.page'] = o.currentPage;
                            }
                            that.render();
                            return false;
                        })
                    );

                  if (i == o.currentPage) $link.addClass("active");

                  $pager.append($link);
              }

              // append quick jump buttons
              if (o.currentPage == 1) {
                  $first.addClass("disabled");
                  $previous.addClass("disabled");
              }
              if (o.currentPage == o.pageCount) {
                  $next.addClass("disabled");
                  $last.addClass("disabled");
              }
              $pager.prepend($first, $previous);
              $pager.append($next, $last);

              this.$pagination.append($pager);
          }
          return this.$pagination;
      }

      , remove: function () {
          var $e = this.$element

          if (this.$section_header) this.$section_header.remove();

          $e.data("datatable", null);
          $e.empty();
      }

    };


    /* DATATABLE PRIVATE METHODS
     * ========================= */

    function showError() {
        var o = this.options
          , $e = this.$element;

        $e.empty();

        // nearly complete... let the user apply any final adjustments
        if (o.tableCallback && typeof o.tableCallback === 'function')
            o.tableCallback.call(this);

        this.loading(false);

        if (this.$default) $e.append(this.$default);
    }

    function runFilter(that) {
        var o = that.options;

        //if (o.debug) console.log(o.filter);
        if ($(this).data('filterType') == 'bool') {
            if ($(this).is(':checked')) {
                o.filter[$(this).data("filter")] = $(this).val();
            }
            else {
                delete o.filter[$(this).data("filter")];
            }
            var str = "";
            for (var key in o.filter) {
                if (str != "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(o.filter[key]);
            }
            history.pushState(o.filter, "", "?" + str);
            that.render();

        }
        else {
            o.filter[$(this).data("filter")] = $(this).val();
            var str = "";
            for (var key in o.filter) {
                if (str != "") {
                    str += "&";
                }
                str += key + "=" + encodeURIComponent(o.filter[key]);
            }
            history.pushState(o.filter, "", "?" + str);
            that.render();
        }
    }


    /* DATATABLE PLUGIN DEFINITION
     * =========================== */

    $.fn.datatable = function (options) {
        $.fn.datatable.init.call(this, options, DataTable, 'datatable');
        return this;
    };

    $.fn.datatable.init = function (options, Constructor, name) {
        var datatable;

        if (options === true) {
            return this.data(name);
        } else if (typeof options == 'string') {
            datatable = this.data(name);
            if (datatable) {
                datatable[options]();
            }
            return this;
        }

        options = $.extend({}, $.fn[name].defaults, options);

        function get(el) {
            var datatable = $.data(el, name);

            if (!datatable) {
                datatable = new Constructor(el, $.fn.datatable.elementOptions(el, options));
                $.data(el, name, datatable);
            }

            return datatable;
        }

        this.each(function () {
            get(this);
        });

        return this;
    };

    $.fn.datatable.DataTable = DataTable;

    $.fn.datatable.elementOptions = function (el, options) {
        return $.metadata ? $.extend({}, options, $(el).metadata()) : options;
    };

    $.fn.datatable.defaults = {
        debug: false,
        id: undefined,
        title: '',
        class: 'table table-primary table-hover',
        perPage: 12,
        pagePadding: 2,
        sort: [],
        filter: {},
        post: {},
        buttons: [],
        sectionHeader: undefined,
        totalRows: 0,
        rowsName: 'rows',
        currentPage: 1,
        showPagination: true,
        showTopPagination: false,
        showHeader: true,
        showFooter: false,
        showFilterRow: false,
        filterModal: undefined,
        allowExport: false,
        allowOverflow: false,
        allowMultipleSort: false,
        allowSaveColumns: true,
        toggleColumns: false,
        url: '',
        columns: [],
        ascending: $("<span></span>").addClass("fa fa-long-arrow-up"),
        descending: $("<span></span>").addClass("fa fa-long-arrow-down"),
        rowCallback: undefined,
        tableCallback: undefined,
        headerCallback: undefined,
        footerCallback: undefined,
        tablePreRender: undefined,
        autoLoad: true,
        tableFade: 500
    };
})(window.jQuery);
